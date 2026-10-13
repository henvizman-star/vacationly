import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import mysql from "../Backend/node_modules/mysql2/promise.js";
import dotenv from "../Backend/node_modules/dotenv/lib/main.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, "Backend/.env"), quiet: true });
const settings = {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "vacationly",
    password: process.env.MYSQL_PASSWORD,
};
const source = process.env.MYSQL_DATABASE || "vacationly";
const scratch = "vacationly_export_check_" + randomBytes(6).toString("hex");
if (!/^[a-zA-Z0-9_]+$/.test(source)) throw new Error("Invalid database name.");
const dump = await fs.readFile(path.join(root, "Database/vacationly-export.sql"));
const connection = await mysql.createConnection(settings);
let created = false;
try {
    // Restore only into a newly created disposable schema; never drop or overwrite the source.
    await connection.query("CREATE DATABASE `" + scratch + "`");
    created = true;
    const executable =
        process.env.MYSQL_CLIENT_PATH ||
        (process.platform === "win32"
            ? "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe"
            : "mysql");
    await new Promise((resolve, reject) => {
        const child = spawn(
            executable,
            [
                "--host=" + settings.host,
                "--port=" + settings.port,
                "--user=" + settings.user,
                "--database=" + scratch,
            ],
            {
                env: { ...process.env, MYSQL_PWD: settings.password },
                stdio: ["pipe", "ignore", "pipe"],
            },
        );
        child.stderr.resume();
        child.on("error", reject);
        child.stdin.on("error", reject);
        child.on("exit", (code) =>
            code === 0 ? resolve() : reject(new Error("Export restore failed.")),
        );
        child.stdin.end(dump);
    });
    for (const table of ["users", "vacations", "likes"]) {
        const [actual] = await connection.query(
            "SELECT COUNT(*) AS total FROM `" + scratch + "`.`" + table + "`",
        );
        const [original] = await connection.query(
            "SELECT COUNT(*) AS total FROM `" + source + "`.`" + table + "`",
        );
        if (actual[0].total !== original[0].total)
            throw new Error("Restored row count differs for " + table);
    }
    console.log("Export restored successfully; all three table counts match the source.");
} finally {
    // scratch is generated above from a fixed prefix and random hex, never from user input.
    try {
        if (created) await connection.query("DROP DATABASE `" + scratch + "`");
    } finally {
        await connection.end();
    }
}
