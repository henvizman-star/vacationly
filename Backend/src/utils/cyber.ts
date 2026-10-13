import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { appConfig } from "./app-config";
import type { UserModel } from "../models/user-model";
import { Role } from "../models/enums";

const scrypt = promisify(scryptCallback);
const tokenUserSchema = z.object({
    id: z.number().int().positive(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    roleId: z.enum(Role),
});
class Cyber {
    // Each password receives its own random salt.
    public async hashPassword(password: string): Promise<string> {
        const salt = randomBytes(16).toString("hex");
        const hash = (await scrypt(password, salt, 64)) as Buffer;
        return salt + ":" + hash.toString("hex");
    }

    // Checks a password against its stored salt and hash.
    public async verifyPassword(password: string, stored: string): Promise<boolean> {
        const [salt, hex] = stored.split(":");
        if (!salt || !hex || !/^[a-f0-9]{128}$/.test(hex)) return false;
        const actual = (await scrypt(password, salt, 64)) as Buffer;
        return timingSafeEqual(actual, Buffer.from(hex, "hex"));
    }

    // Creates a signed, three-hour token with safe user details.
    public generateToken(user: UserModel): string {
        // Explicit allowlist: never include a password hash in a token.
        const safeUser = tokenUserSchema.parse(user);
        return jwt.sign({ user: safeUser }, appConfig.jwtSecret, {
            algorithm: "HS256",
            expiresIn: "3h",
            issuer: "vacationly",
            audience: "vacationly-web",
        });
    }

    // Verifies a token and returns the user details inside it.
    public readToken(token: string): UserModel {
        const payload = jwt.verify(token, appConfig.jwtSecret, {
            algorithms: ["HS256"],
            issuer: "vacationly",
            audience: "vacationly-web",
        });
        if (typeof payload === "string") throw new Error("Invalid token.");
        return tokenUserSchema.parse(payload.user);
    }
}
export const cyber = new Cyber();
