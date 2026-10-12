import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import type OpenAI from "openai";
process.env.JWT_SECRET = "test-only-secret-never-used-outside-test-suite";
process.env.MYSQL_PASSWORD = "test-only";
process.env.OPENAI_API_KEY = "";
const { AiService } = await import("../src/services/ai-service");
const { dal } = await import("../src/utils/dal");
const { cyber } = await import("../src/utils/cyber");
const { createServer } = await import("../src/server");

test("AI recommendation handles an empty provider response and unavailable configuration honestly", async () => {
    await assert.rejects(new AiService().recommend("Rome"), { status: 503 });
    const provider = { responses: { create: async () => ({ output_text: "" }) } } as unknown as Pick<OpenAI, "responses">;
    await assert.rejects(new AiService(provider).recommend("Rome"), { status: 503 });
});

test("natural-language questions execute actual MCP calls before returning the model answer", async context => {
    let queried = false;
    let turn = 0;
    context.mock.method(dal, "execute", async <T>(sql: string) => {
        assert.match(sql, /AVG\(price\)/);
        queried = true;
        return [{ count: 12, averagePrice: 2000, minPrice: 0, maxPrice: 10000 }] as T;
    });
    const provider = { responses: { create: async (options: { input: unknown[]; tool_choice: string }) => {
        if (turn++ === 0) {
            assert.equal(options.tool_choice, "required");
            return { output: [{ type: "function_call", name: "vacation_statistics", arguments: '{"status":"all"}', call_id: "call-1" }], output_text: "" };
        }
        assert.equal(queried, true);
        assert.match(JSON.stringify(options.input), /averagePrice/);
        return { output: [], output_text: "The average price is 2,000 USD." };
    } } } as unknown as Pick<OpenAI, "responses">;
    assert.equal(await new AiService(provider).ask("What is the average vacation price?"), "The average price is 2,000 USD.");
    assert.equal(turn, 2);
});

test("AI HTTP routes require authentication, validate input and report missing provider configuration", async context => {
    const app = createServer();
    const user = { id: 7, firstName: "Test", lastName: "User", email: "user@example.com", roleId: 2 };
    context.mock.method(dal, "execute", async <T>() => [user] as T);
    const token = cyber.generateToken(user);
    assert.equal((await request(app).post("/api/ai/recommendation").send({ destination: "Rome" })).status, 401);
    assert.equal((await request(app).post("/api/ai/question").auth(token, { type: "bearer" }).send({ question: " " })).status, 422);
    assert.equal((await request(app).post("/api/ai/recommendation").auth(token, { type: "bearer" }).send({ destination: "Rome" })).status, 503);
});
