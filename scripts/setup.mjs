import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Create local secrets only when no root configuration exists.
const envPath = path.join(root, ".env");
if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, [
        "MYSQL_PASSWORD=" + randomBytes(24).toString("hex"),
        "MYSQL_ROOT_PASSWORD=" + randomBytes(24).toString("hex"),
        "JWT_SECRET=" + randomBytes(48).toString("hex"), ""
    ].join("\n"), { flag: "wx" });
    console.log("Created local Docker configuration.");
}
const entries = Object.fromEntries(fs.readFileSync(envPath, "utf8").split(/\r?\n/)
    .filter(line => /^[A-Z_]+=/.test(line)).map(line => {
        const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)];
    }));
if (!entries.MYSQL_PASSWORD || !entries.JWT_SECRET) throw new Error("Root .env needs MYSQL_PASSWORD and JWT_SECRET.");
const backendEnv = path.join(root, "Backend", ".env");
// Preserve any developer-specific database settings already present.
if (!fs.existsSync(backendEnv)) {
    fs.writeFileSync(backendEnv, [
        "NODE_ENV=development", "PORT=4001", "MYSQL_HOST=127.0.0.1", "MYSQL_PORT=3307",
        "MYSQL_USER=vacationly", "MYSQL_DATABASE=vacationly",
        "MYSQL_PASSWORD=" + entries.MYSQL_PASSWORD, "JWT_SECRET=" + entries.JWT_SECRET,
        "CLIENT_ORIGIN=http://localhost:5173", "SEED_ADMIN_EMAIL=", "SEED_ADMIN_PASSWORD=",
        "OPENAI_API_KEY=", "OPENAI_MODEL=gpt-4.1-mini", ""
    ].join("\n"), { flag: "wx" });
    console.log("Created Backend/.env for the local Docker database on port 3307.");
}
console.log("Setup ready. Existing configuration was preserved.");
