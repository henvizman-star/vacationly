import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ quiet: true });
// Parse required environment settings at startup so invalid configuration fails early.
const environment = z
    .object({
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
        PORT: z.coerce.number().int().min(1).max(65535).default(4000),
        MYSQL_HOST: z.string().default("127.0.0.1"),
        MYSQL_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
        MYSQL_USER: z.string().min(1).default("vacationly"),
        MYSQL_PASSWORD: z.string().min(1),
        MYSQL_DATABASE: z
            .string()
            .regex(/^[a-zA-Z0-9_]+$/)
            .default("vacationly"),
        JWT_SECRET: z.string().min(32),
        CLIENT_ORIGIN: z.url().default("http://localhost:5173"),
        OPENAI_API_KEY: z.string().default(""),
        OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
    })
    .parse(process.env);

class AppConfig {
    public readonly environment = environment.NODE_ENV;
    public readonly port = environment.PORT;
    public readonly mysqlHost = environment.MYSQL_HOST;
    public readonly mysqlPort = environment.MYSQL_PORT;
    public readonly mysqlUser = environment.MYSQL_USER;
    public readonly mysqlPassword = environment.MYSQL_PASSWORD;
    public readonly mysqlDatabase = environment.MYSQL_DATABASE;
    public readonly jwtSecret = environment.JWT_SECRET;
    public readonly clientOrigin = environment.CLIENT_ORIGIN;
    public readonly openaiApiKey = environment.OPENAI_API_KEY;
    public readonly openaiModel = environment.OPENAI_MODEL;
    public readonly imagesPath = path.resolve("assets/images");
    public readonly uploadsPath = path.resolve("uploads");
}
export const appConfig = new AppConfig();
