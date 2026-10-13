import fs from "node:fs/promises";
import path from "node:path";
import { dal } from "../utils/dal";
import { cyber } from "../utils/cyber";
import { registrationSchema } from "../models/user-model";

// Applies the schema, seeds an empty vacations table, and optionally creates an admin.
// The configured database must already exist; existing data is never dropped.
async function run(): Promise<void> {
    const schema = await fs.readFile(path.resolve("../Database/01-schema.sql"), "utf8");
    for (const statement of schema
        .split(";")
        .map((value) => value.trim())
        .filter(Boolean)) {
        await dal.execute(statement);
    }
    const [row] = await dal.execute<{ total: number }[]>("SELECT COUNT(*) AS total FROM vacations");
    if (Number(row.total) === 0) {
        const seed = await fs.readFile(path.resolve("../Database/02-seed.sql"), "utf8");
        await dal.execute(seed);
        console.log("Added 12 vacation examples.");
    } else {
        console.log("Existing vacations preserved; seed skipped.");
    }

    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (email || password) {
        const admin = registrationSchema.parse({
            firstName: "Vacationly",
            lastName: "Admin",
            email,
            password,
        });
        const existing = await dal.execute<{ id: number }[]>(
            "SELECT id FROM users WHERE email = ?",
            [admin.email],
        );
        if (existing.length) {
            console.log("Account with the administrator email already exists; left unchanged.");
        } else {
            await dal.execute(
                "INSERT INTO users (firstName, lastName, email, passwordHash, roleId) VALUES (?, ?, ?, ?, 1)",
                [
                    admin.firstName,
                    admin.lastName,
                    admin.email,
                    await cyber.hashPassword(admin.password),
                ],
            );
            console.log("Administrator created.");
        }
    }
}
run()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : "Database initialization failed.");
        process.exitCode = 1;
    })
    .finally(() => dal.close());
