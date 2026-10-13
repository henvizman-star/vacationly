import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import dotenv from "../Backend/node_modules/dotenv/lib/main.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, "Backend/.env"), quiet: true });
// MYSQL_PWD keeps the database password out of process arguments and console output.
const executable =
    process.env.MYSQLDUMP_PATH ||
    (process.platform === "win32"
        ? "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe"
        : "mysqldump");
const target = path.join(root, "Database/vacationly-export.sql");
const args = [
    "--host=" + (process.env.MYSQL_HOST || "127.0.0.1"),
    "--port=" + (process.env.MYSQL_PORT || "3306"),
    "--user=" + (process.env.MYSQL_USER || "vacationly"),
    "--single-transaction",
    "--no-tablespaces",
    "--set-gtid-purged=OFF",
    "--column-statistics=0",
    "--result-file=" + target,
    process.env.MYSQL_DATABASE || "vacationly",
];
const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
        env: { ...process.env, MYSQL_PWD: process.env.MYSQL_PASSWORD },
        stdio: ["ignore", "ignore", "pipe"],
    });
    // Do not print server error messages that might contain connection details.
    child.stderr.resume();
    child.on("error", reject);
    child.on("exit", resolve);
});
if (exitCode !== 0)
    throw new Error("Database export failed. Check MySQL access and MYSQLDUMP_PATH.");
const dump = await fs.readFile(target, "utf8");
if (
    !["users", "vacations", "likes"].every((table) => dump.includes("CREATE TABLE `" + table + "`"))
) {
    throw new Error("Export does not contain the expected schema.");
}
console.log("Exported the real MySQL database to Database/vacationly-export.sql.");
