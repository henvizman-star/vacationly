import assert from "node:assert/strict";
import OpenAI from "openai";
import { AiService } from "../src/services/ai-service";
import { appConfig } from "../src/utils/app-config";
import { dal } from "../src/utils/dal";

// Run explicitly: this smoke check makes paid provider calls and read-only SQL queries.
// Never print credentials, provider error bodies or request headers.
assert.ok(appConfig.openaiApiKey.trim(), "OPENAI_API_KEY is missing");
console.log("API key configured: yes; model:", appConfig.openaiModel);
const provider = new OpenAI({ apiKey: appConfig.openaiApiKey, timeout: 25000, maxRetries: 0 });
const service = new AiService({
    responses: {
        create: async (input: Parameters<typeof provider.responses.create>[0]) => {
            try {
                return await provider.responses.create(input);
            } catch (error) {
                if (error instanceof OpenAI.APIError)
                    console.error("Provider HTTP status:", error.status, "code:", error.code);
                else
                    console.error(
                        "Provider failure type:",
                        error instanceof Error ? error.name : "Unknown",
                    );
                throw new Error("Live provider request failed; sensitive details omitted");
            }
        },
    },
} as Pick<OpenAI, "responses">);

try {
    const recommendation = await service.recommend("Paris, France");
    assert.ok(recommendation.trim().length > 40);
    console.log("Recommendation passed:", recommendation);
    const [expected] = await dal.execute<{ count: number; averagePrice: number }[]>(
        "SELECT COUNT(*) AS count, AVG(price) AS averagePrice FROM vacations",
    );
    const answer = await service.ask(
        "How many vacations are in the database in total, and what is their average price in USD? Give the count as digits and the average rounded to two decimals.",
    );
    assert.ok(
        answer.includes(String(expected.count)),
        "Answer must contain the real database count",
    );
    assert.ok(
        answer.replaceAll(",", "").includes(Number(expected.averagePrice).toFixed(2)),
        "Average must match real SQL",
    );
    console.log("Database statistics passed:", answer);
    const europe = await service.ask(
        "List upcoming vacations in Europe with their destinations and prices. If there are none, say so.",
    );
    assert.ok(europe.trim());
    console.log("Filtered database question returned:", europe);
} catch (error) {
    console.error(error instanceof Error ? error.message : "Live check failed");
    process.exitCode = 1;
} finally {
    await dal.close();
}
