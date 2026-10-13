import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import mysql from "mysql2/promise";

// Run inside the backend container. Output only hashes, never database rows or secrets.
const marker = "/app/uploads/.persistence-check";
const action = process.env.PERSISTENCE_ACTION;
if (action === "prepare") {
    await fs.writeFile(marker, "Vacationly volume persistence verification", { flag: "wx" });
} else if (action === "cleanup") {
    assert.equal(await fs.readFile(marker, "utf8"), "Vacationly volume persistence verification");
    await fs.unlink(marker);
    process.exit(0);
} else {
    assert.equal(action, "verify");
}
assert.equal(await fs.readFile(marker, "utf8"), "Vacationly volume persistence verification");
const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    dateStrings: true,
});
try {
    const digest = createHash("sha256");
    for (const table of ["users", "vacations", "likes"]) {
        const [rows] = await db.query(`SELECT * FROM ${table}`);
        // Sort serialized rows independently of table keys and query order.
        digest.update(JSON.stringify(rows.map((row) => JSON.stringify(row)).sort()));
    }
    for (const name of (await fs.readdir("/app/uploads")).sort()) {
        digest.update(name);
        digest.update(await fs.readFile(`/app/uploads/${name}`));
    }
    console.log(digest.digest("hex"));
} finally {
    await db.end();
}
