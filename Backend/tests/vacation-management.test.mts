import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import type { UploadedFile } from "express-fileupload";
process.env.JWT_SECRET = "test-only-secret-never-used-outside-test-suite";
process.env.MYSQL_PASSWORD = "test-only";
const { VacationService } = await import("../src/services/vacation-service");
const { createServer } = await import("../src/server");
const { dal } = await import("../src/utils/dal");
const { cyber } = await import("../src/utils/cyber");
const previous = {
    id: 1,
    destination: "Rome",
    country: "Italy",
    continent: "Europe",
    description: "Explore Rome.",
    startDate: "2020-01-01",
    endDate: "2020-01-02",
    price: 0,
    imageName: "rome.jpg",
    likesCount: 2,
};

test("editing keeps the seed image, accepts past dates and preserves likes", async (context) => {
    const save = context.mock.fn(async () => "unused.png");
    const remove = context.mock.fn(async () => {});
    const service = new VacationService(
        {
            execute: async <T,>(sql: string, values?: unknown[]) => {
                if (sql.startsWith("SELECT")) return [previous] as T;
                assert.equal(values?.[7], "rome.jpg");
                return { affectedRows: 1 } as T;
            },
        },
        { save, remove },
    );
    const result = await service.update(1, previous);
    assert.equal(result.imageName, "rome.jpg");
    assert.equal(result.likesCount, 2);
    assert.equal(save.mock.callCount(), 0);
    assert.equal(remove.mock.callCount(), 0);
});

test("a concurrent edit cleans up the replacement but preserves the existing image", async (context) => {
    const newName = "11111111-1111-4111-8111-111111111111.png";
    const remove = context.mock.fn(async (_name: string) => {});
    const service = new VacationService(
        {
            execute: async <T,>(sql: string) =>
                (sql.startsWith("SELECT") ? [previous] : { affectedRows: 0 }) as T,
        },
        { save: async () => newName, remove },
    );
    await assert.rejects(service.update(1, previous, {} as UploadedFile), { status: 409 });
    assert.deepEqual(remove.mock.calls[0].arguments, [newName]);
});

test("missing vacations report 404 and deleting seed records preserves shared seed assets", async (context) => {
    const missing = new VacationService({ execute: async <T,>() => [] as T });
    await assert.rejects(missing.getOne(99), { status: 404 });
    const remove = context.mock.fn(async () => {});
    const service = new VacationService(
        {
            execute: async <T,>(sql: string) =>
                (sql.startsWith("SELECT") ? [previous] : { affectedRows: 1 }) as T,
        },
        { save: async () => "unused", remove },
    );
    await service.remove(1);
    assert.equal(remove.mock.callCount(), 0);
});

test("CSV includes zeros, quotes commas and quotes, and neutralizes formula cells", async () => {
    const service = new VacationService({
        execute: async <T,>() =>
            [
                { id: 1, destination: 'City, "Bay"', likes: "0" },
                { id: 2, destination: "=SUM(A1)", likes: "3" },
            ] as T,
    });
    const csv = await service.getCsv();
    assert.equal(csv, '\uFEFFDestination,Likes\r\n"City, ""Bay""",0\r\n"\'=SUM(A1)",3\r\n');
});

test("administrator management and reports reject regular users and guests", async (context) => {
    const user = {
        id: 7,
        firstName: "Test",
        lastName: "User",
        email: "user@example.com",
        roleId: 2,
    };
    context.mock.method(dal, "execute", async <T,>() => [user] as T);
    const app = createServer();
    const token = cyber.generateToken(user);
    for (const url of ["/api/vacations/1", "/api/vacations/report", "/api/vacations/report.csv"]) {
        assert.equal((await request(app).get(url)).status, 401);
        assert.equal((await request(app).get(url).auth(token, { type: "bearer" })).status, 403);
    }
    assert.equal(
        (await request(app).put("/api/vacations/1").auth(token, { type: "bearer" })).status,
        403,
    );
    assert.equal(
        (await request(app).delete("/api/vacations/1").auth(token, { type: "bearer" })).status,
        403,
    );
});
