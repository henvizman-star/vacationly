import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-never-used-outside-test-suite";
process.env.MYSQL_PASSWORD = "test-only";
const { createServer } = await import("../src/server");
const { dal } = await import("../src/utils/dal");
const { cyber } = await import("../src/utils/cyber");
const { registrationSchema, credentialsSchema } = await import("../src/models/user-model");
const { UserService } = await import("../src/services/user-service");
const { VacationService } = await import("../src/services/vacation-service");
const { vacationQuerySchema } = await import("../src/models/vacation-model");
const app = createServer();
const member = {
    id: 7,
    firstName: "Alex",
    lastName: "River",
    email: "alex@example.com",
    roleId: 2,
};
const token = cyber.generateToken(member);
const originalExecute = dal.execute;
afterEach(() => {
    dal.execute = originalExecute;
});

test("registration requires real email, names and at least four password characters", () => {
    const base = { ...member, password: "1234" };
    assert.equal(registrationSchema.safeParse(base).success, true);
    for (const change of [
        { firstName: " " },
        { lastName: "" },
        { email: "bad" },
        { password: "123" },
    ]) {
        assert.equal(registrationSchema.safeParse({ ...base, ...change }).success, false);
    }
    assert.equal(
        credentialsSchema.safeParse({ email: member.email, password: "123" }).success,
        false,
    );
});

test("registration normalizes email and removes caller-supplied role", () => {
    const result = registrationSchema.parse({
        ...member,
        email: "Alex@EXAMPLE.com",
        password: "1234",
        roleId: 1,
    });
    assert.equal(result.email, "alex@example.com");
    assert.equal("roleId" in result, false);
});

test("passwords use random salts and verify without changing the original password", async () => {
    const password = "<word>1234";
    const first = await cyber.hashPassword(password);
    const second = await cyber.hashPassword(password);
    assert.notEqual(first, second);
    assert.equal(await cyber.verifyPassword(password, first), true);
    assert.equal(await cyber.verifyPassword("wrong", first), false);
    assert.equal(await cyber.verifyPassword(password, "broken"), false);
});

test("tokens contain only public user fields and reject expiry or tampering", () => {
    const safe = cyber.generateToken({ ...member, passwordHash: "never-leak" } as typeof member);
    assert.equal(JSON.stringify(jwt.decode(safe)).includes("never-leak"), false);
    assert.throws(() => cyber.readToken(safe + "x"));
    const expired = jwt.sign({ user: member }, process.env.JWT_SECRET!, {
        expiresIn: -1,
        issuer: "vacationly",
        audience: "vacationly-web",
    });
    assert.throws(() => cyber.readToken(expired));
});

test("registration always writes a User and a password hash", async () => {
    let captured: unknown[] = [];
    const service = new UserService({
        execute: async <T,>(_sql: string, values?: unknown[]) => {
            captured = values ?? [];
            return { insertId: 8 } as T;
        },
    });
    const result = await service.register({
        firstName: "Alex",
        lastName: "River",
        email: member.email,
        password: "1234",
    });
    assert.equal(captured[4], 2);
    assert.notEqual(captured[3], "1234");
    assert.equal(cyber.readToken(result).id, 8);
});

test("duplicate email becomes HTTP 409 instead of exposing a SQL error", async () => {
    const service = new UserService({
        execute: async () => {
            throw { code: "ER_DUP_ENTRY" };
        },
    });
    await assert.rejects(service.register({ ...member, password: "1234" }), { status: 409 });
});

test("wrong login password is rejected", async () => {
    const hash = await cyber.hashPassword("1234");
    const service = new UserService({
        execute: async <T,>() => [{ ...member, passwordHash: hash }] as T,
    });
    await assert.rejects(service.login({ email: member.email, password: "wrong" }), {
        status: 401,
    });
    assert.equal(
        cyber.readToken(await service.login({ email: member.email, password: "1234" })).id,
        member.id,
    );
});

test("vacation query rejects invalid page/filter and has safe defaults", () => {
    assert.deepEqual(vacationQuerySchema.parse({}), { page: 1, filter: "all" });
    for (const query of [{ page: 0 }, { page: "1;DROP TABLE users" }, { filter: "unknown" }]) {
        assert.equal(vacationQuerySchema.safeParse(query).success, false);
    }
});

test("pagination filters before counting, clamps the last page, and sorts with a stable tie-breaker", async () => {
    const calls: { sql: string; values?: unknown[] }[] = [];
    const service = new VacationService({
        execute: async <T,>(sql: string, values?: unknown[]) => {
            calls.push({ sql, values });
            if (sql.startsWith("SELECT COUNT")) return [{ total: 12 }] as T;
            return [
                { id: 3, imageName: "paris.jpg", price: "1590.00", likesCount: "2", isLiked: 1 },
            ] as T;
        },
    });
    const result = await service.getPage(7, { filter: "liked", page: 99 });
    assert.equal(result.page, 2);
    assert.equal(result.pageSize, 9);
    assert.equal(result.totalPages, 2);
    assert.match(calls[0].sql, /EXISTS/);
    assert.deepEqual(calls[0].values, [7]);
    assert.match(calls[1].sql, /ORDER BY v.startDate ASC, v.id ASC LIMIT 9 OFFSET 9/);
    assert.deepEqual(calls[1].values, [7, 7]);
    assert.equal(result.vacations[0].isLiked, true);
    assert.equal(result.vacations[0].price, 1590);
});

test("active vacations include both boundary dates and upcoming excludes today", async () => {
    const sqls: string[] = [];
    const service = new VacationService({
        execute: async <T,>(sql: string) => {
            sqls.push(sql);
            return (sql.startsWith("SELECT COUNT") ? [{ total: 0 }] : []) as T;
        },
    });
    await service.getPage(7, { filter: "active", page: 1 });
    assert.match(sqls[0], /startDate <= UTC_DATE\(\) AND v.endDate >= UTC_DATE\(\)/);
    await service.getPage(7, { filter: "upcoming", page: 1 });
    assert.match(sqls[2], /startDate > UTC_DATE\(\)/);
});

test("like removal is scoped to the signed-in user", async () => {
    let captured: unknown[] = [];
    const service = new VacationService({
        execute: async <T,>(sql: string, values?: unknown[]) => {
            if (sql.startsWith("SELECT")) return [{ id: 2 }] as T;
            captured = values ?? [];
            return {} as T;
        },
    });
    await service.setLike(7, 2, false);
    assert.deepEqual(captured, [7, 2]);
});

test("missing vacation returns 404 and repeat Like is idempotent", async () => {
    const missing = new VacationService({ execute: async <T,>() => [] as T });
    await assert.rejects(missing.setLike(7, 999, true), { status: 404 });
    const duplicate = new VacationService({
        execute: async <T,>(sql: string) => {
            if (sql.startsWith("SELECT")) return [{ id: 2 }] as T;
            throw { code: "ER_DUP_ENTRY" };
        },
    });
    await duplicate.setLike(7, 2, true);
});

test("HTTP routes protect vacations and reject bad JSON and unknown routes", async () => {
    assert.equal((await request(app).get("/api/vacations")).status, 401);
    assert.equal(
        (
            await request(app)
                .get("/api/vacations")
                .set("Authorization", "Basic " + token)
        ).status,
        401,
    );
    assert.equal(
        (await request(app).post("/api/login").send({ email: "bad", password: "1234" })).status,
        422,
    );
    assert.equal(
        (await request(app).post("/api/login").set("Content-Type", "application/json").send("{"))
            .status,
        400,
    );
    assert.equal((await request(app).get("/api/not-real")).status, 404);
});

test("HTTP middleware reads the current database role and prevents administrator Likes", async () => {
    dal.execute = async <T,>() => [{ ...member, roleId: 1 }] as T;
    const result = await request(app).put("/api/vacations/1/like").auth(token, { type: "bearer" });
    assert.equal(result.status, 403);
    assert.match(result.body.message, /Administrators/);
});

test("HTTP health endpoint reports database failure honestly", async () => {
    dal.execute = async () => {
        throw new Error("offline");
    };
    const result = await request(app).get("/api/health");
    assert.equal(result.status, 503);
    assert.equal(result.body.database, "disconnected");
});
