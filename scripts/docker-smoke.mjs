import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import fs from "node:fs/promises";

// Run inside the backend container through stdin; never print credentials or tokens.
const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});
const email = `docker-smoke-${randomUUID()}@example.com`;
const password = randomUUID();
const base = "http://frontend/api";
let token;
let createdId;
async function request(route, options = {}, expected = 200) {
    const response = await fetch(base + route, {
        ...options,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
    assert.equal(response.status, expected, route);
    return response;
}
try {
    assert.equal((await fetch("http://frontend/vacations")).status, 200);
    await request("/health");
    await request("/vacations", {}, 401);
    token = await (
        await request(
            "/register",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName: "Docker", lastName: "Smoke", email, password }),
            },
            201,
        )
    ).json();
    await request("/me");
    const page = await (await request("/vacations")).json();
    assert.equal(page.total, 12);
    assert.equal(page.vacations.length, 9);
    const vacation = page.vacations[0];
    assert.equal((await fetch(new URL(vacation.imageUrl, "http://frontend"))).status, 200);
    await request(`/vacations/${vacation.id}/like`, { method: "PUT" }, 204);
    const liked = await (await request("/vacations?filter=liked")).json();
    assert.equal(liked.total, 1);
    await request(`/vacations/${vacation.id}/like`, { method: "DELETE" }, 204);
    await request("/vacations/report", {}, 403);
    await db.execute("UPDATE users SET roleId = 1 WHERE email = ?", [email]);
    const report = await (await request("/vacations/report")).json();
    assert.equal(report.length, 12);
    assert.match(await (await request("/vacations/report.csv")).text(), /Destination,Likes/);
    // Exercise real multipart uploads and cleanup through the deployed nginx/API chain.
    const today = new Date().toISOString().slice(0, 10);
    const fields = {
        destination: `Docker QA ${randomUUID()}`,
        country: "France",
        continent: "Europe",
        description: "Temporary Docker integration check",
        startDate: today,
        endDate: today,
        price: "1290.50",
    };
    async function form(imageName) {
        const data = new FormData();
        for (const [key, value] of Object.entries(fields)) data.set(key, value);
        if (imageName)
            data.set(
                "image",
                new Blob([await fs.readFile(`/app/assets/images/${imageName}`)], {
                    type: "image/jpeg",
                }),
                imageName,
            );
        return data;
    }
    const created = await (
        await request("/vacations", { method: "POST", body: await form("paris.jpg") }, 201)
    ).json();
    createdId = created.id;
    assert.equal(Number(created.price), 1290.5);
    assert.equal((await fetch(new URL(created.imageUrl, "http://frontend"))).status, 200);
    fields.startDate = "2020-01-01";
    fields.endDate = "2020-01-02";
    const retained = await (
        await request(`/vacations/${createdId}`, { method: "PUT", body: await form() })
    ).json();
    assert.equal(retained.imageName, created.imageName);
    const replaced = await (
        await request(`/vacations/${createdId}`, { method: "PUT", body: await form("rome.jpg") })
    ).json();
    assert.notEqual(replaced.imageName, created.imageName);
    assert.equal((await fetch(new URL(created.imageUrl, "http://frontend"))).status, 404);
    assert.equal((await fetch(new URL(replaced.imageUrl, "http://frontend"))).status, 200);
    await request(`/vacations/${createdId}`, { method: "DELETE" }, 204);
    await request(`/vacations/${createdId}`, {}, 404);
    assert.equal((await fetch(new URL(replaced.imageUrl, "http://frontend"))).status, 404);
    createdId = undefined;
    assert.equal((await (await request("/vacations")).json()).total, 12);
    console.log(
        "Docker multipart CRUD passed: upload, past-date edit, image retention/replacement and file deletion.",
    );
    console.log(
        "Docker smoke passed: frontend/proxy, health, registration, authentication, 12 vacations, pagination, image, likes, roles, report and CSV.",
    );
} finally {
    // Delete only the record created by this run if an assertion interrupts CRUD.
    if (createdId) await request(`/vacations/${createdId}`, { method: "DELETE" }, 204);
    await db.execute("DELETE FROM users WHERE email = ?", [email]);
    await db.end();
}
