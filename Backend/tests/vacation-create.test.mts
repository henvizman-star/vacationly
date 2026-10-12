import { test } from "node:test";
import assert from "node:assert/strict";
import type { UploadedFile } from "express-fileupload";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-never-used-outside-test-suite";
process.env.MYSQL_PASSWORD = "test-only";
const { VacationService } = await import("../src/services/vacation-service");
const { createServer } = await import("../src/server");
const { dal } = await import("../src/utils/dal");
const { cyber } = await import("../src/utils/cyber");
const { imageStorage } = await import("../src/utils/image-storage");

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC9sAAAAASUVORK5CYII=", "base64");
const image = { data: png, name: "paris.png", size: png.length, mimetype: "image/png" } as UploadedFile;
const imageName = "11111111-1111-4111-8111-111111111111.png";
const admin = { id: 7, firstName: "Test", lastName: "Admin", email: "admin@example.com", roleId: 1 };

// Use today's date so the creation tests remain valid on later runs.
function vacation() {
    const today = new Date().toISOString().slice(0, 10);
    return { destination: "Paris", country: "France", continent: "Europe", description: "Walk beside the Seine.",
        startDate: today, endDate: today, price: 1290.50 };
}

test("creation stores only an image filename and preserves price, dates and initial like state", async context => {
    const input = vacation();
    const save = context.mock.fn(async () => imageName);
    const remove = context.mock.fn(async () => {});
    const service = new VacationService({ execute: async <T>(sql: string, values?: unknown[]) => {
        assert.match(sql, /^INSERT INTO vacations/);
        assert.deepEqual(values, [input.destination, input.country, input.continent, input.description,
            input.startDate, input.endDate, input.price, imageName]);
        return { insertId: 42 } as T;
    } }, { save, remove });
    const result = await service.add(input, image);
    assert.deepEqual(result, { ...input, id: 42, imageName,
        imageUrl: "/api/vacations/images/" + imageName, likesCount: 0, isLiked: false });
    assert.equal(save.mock.calls[0].arguments[0], image);
    assert.equal(remove.mock.callCount(), 0);
});

test("a rejected insert removes the newly saved image and rethrows the database failure", async context => {
    const failure = new Error("database failed");
    const remove = context.mock.fn(async (_name: string) => {});
    const service = new VacationService({ execute: async () => { throw failure; } }, {
        save: async () => imageName, remove
    });
    await assert.rejects(service.add(vacation(), image), error => error === failure);
    assert.deepEqual(remove.mock.calls[0].arguments, [imageName]);
});

test("image storage failure prevents any database insert", async context => {
    const execute = context.mock.fn(async <T>() => ({ insertId: 42 } as T));
    const failure = new Error("storage failed");
    const service = new VacationService({ execute }, {
        save: async () => { throw failure; }, remove: async () => {}
    });
    await assert.rejects(service.add(vacation(), image), error => error === failure);
    assert.equal(execute.mock.callCount(), 0);
});

test("cleanup failure preserves the original insert failure and logs no sensitive detail", async context => {
    const failure = new Error("private SQL details");
    const log = context.mock.method(console, "error", () => {});
    const service = new VacationService({ execute: async () => { throw failure; } }, {
        save: async () => imageName, remove: async () => { throw new Error("private file details"); }
    });
    await assert.rejects(service.add(vacation(), image), error => error === failure);
    assert.deepEqual(log.mock.calls[0].arguments, ["Image cleanup failed:", "Error"]);
});

test("POST vacations rejects guests and regular users before saving a file", async context => {
    const save = context.mock.method(imageStorage, "save", async () => imageName);
    context.mock.method(dal, "execute", async <T>() => [{ ...admin, roleId: 2 }] as T);
    const app = createServer();
    assert.equal((await request(app).post("/api/vacations")).status, 401);
    // A token claiming Admin must not override the account's current User role.
    const result = await request(app).post("/api/vacations").auth(cyber.generateToken(admin), { type: "bearer" })
        .field("destination", "Paris").attach("image", png, "paris.png");
    assert.equal(result.status, 403);
    assert.equal(save.mock.callCount(), 0);
});

test("POST vacations validates fields and images before insertion and returns HTTP 201", async context => {
    const input = vacation();
    let inserts = 0;
    context.mock.method(dal, "execute", async <T>(sql: string) => {
        if (sql.startsWith("SELECT")) return [admin] as T;
        inserts++;
        return { insertId: 42 } as T;
    });
    const save = context.mock.method(imageStorage, "save", async () => imageName);
    const app = createServer();
    const token = cyber.generateToken(admin);
    const post = () => request(app).post("/api/vacations").auth(token, { type: "bearer" });
    assert.equal((await post().field({ ...input, price: "10001" }).attach("image", png, "paris.png")).status, 422);
    assert.equal((await post().field(input)).status, 422);
    assert.equal((await post().field(input).attach("image", png, "one.png").attach("image", png, "two.png")).status, 422);
    assert.equal(inserts, 0);
    assert.equal(save.mock.callCount(), 0);
    const result = await post().field(input).attach("image", png, "paris.png");
    assert.equal(result.status, 201);
    assert.equal(result.body.price, 1290.50);
    assert.equal(result.body.id, 42);
    assert.equal(result.body.imageName, imageName);
    assert.equal(inserts, 1);
});
