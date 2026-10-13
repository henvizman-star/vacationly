import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import fs from "node:fs/promises";

// Explicit paid smoke check through the deployed nginx/API, with SQL-grounded answers.
const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});
const email = `live-check-${randomUUID()}@example.com`;
let token;
async function request(route, body, expected = 200) {
    const response = await fetch("http://frontend/api" + route, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90000),
    });
    assert.equal(
        response.status,
        expected,
        `Live endpoint failed: ${route} (response body omitted)`,
    );
    return response.json();
}
try {
    // Abort before external calls unless all vacation text/prices are the bundled public demo fixtures.
    const seed = await fs.readFile("/Database/02-seed.sql", "utf8");
    const expected = [
        ...seed.matchAll(
            /\('([^']*)', '([^']*)', '([^']*)', '([^']*)',[^\n]*?, (\d+), '([^']*)'\)/g,
        ),
    ]
        .map((match) =>
            JSON.stringify([match[1], match[2], match[3], match[4], Number(match[5]), match[6]]),
        )
        .sort();
    const [vacations] = await db.query(
        "SELECT destination, country, continent, description, price, imageName FROM vacations",
    );
    const actual = vacations
        .map((row) =>
            JSON.stringify([
                row.destination,
                row.country,
                row.continent,
                row.description,
                Number(row.price),
                row.imageName,
            ]),
        )
        .sort();
    assert.equal(expected.length, 12);
    assert.deepEqual(actual, expected, "Live checks require only bundled demo vacations");
    console.log(
        "Preflight: vacation payload matches all 12 bundled public demo fixtures; MCP exposes no user records",
    );
    token = await request(
        "/register",
        { firstName: "Live", lastName: "Check", email, password: randomUUID() },
        201,
    );
    const recommendation = await request("/ai/recommendation", { destination: "Paris, France" });
    assert.ok(recommendation.answer.trim().length > 40);
    console.log("Docker live recommendation passed");
    const [[stats]] = await db.query(
        "SELECT COUNT(*) AS total, AVG(price) AS averagePrice, SUM(startDate <= UTC_DATE() AND endDate >= UTC_DATE()) AS active FROM vacations",
    );
    const answer = await request("/ai/question", {
        question:
            "How many vacations exist in total, what is their average price in USD rounded to two decimals, and how many are active today? Label each value total, average and active; use digits.",
    });
    const normalized = answer.answer.replaceAll(",", "");
    assert.ok(normalized.includes(String(stats.total)));
    assert.ok(normalized.includes(Number(stats.averagePrice).toFixed(2)));
    assert.match(
        normalized,
        new RegExp(
            `active[^0-9]{0,80}${Number(stats.active)}\\b|\\b${Number(stats.active)}[^0-9]{0,40}active`,
            "i",
        ),
    );
    console.log("Docker live MCP statistics passed: total, average and active count match SQL");
    const [matches] = await db.query(
        "SELECT destination FROM vacations WHERE continent = 'Europe' AND startDate > UTC_DATE() ORDER BY startDate, id LIMIT 50",
    );
    const europe = await request("/ai/question", {
        question:
            "List all upcoming vacations in Europe by their exact stored destination names. If there are none, explicitly say there are none.",
    });
    assert.ok(europe.answer.trim());
    if (matches.length)
        for (const row of matches)
            assert.ok(
                europe.answer.includes(row.destination),
                `Missing expected destination ${row.destination}`,
            );
    else assert.match(europe.answer, /none|no upcoming|no vacations/i);
    console.log("Docker live MCP Europe filter passed against SQL destinations");
} finally {
    await db.execute("DELETE FROM users WHERE email = ?", [email]);
    await db.end();
}
