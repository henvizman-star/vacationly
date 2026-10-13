import mysql, { type QueryResult } from "mysql2/promise";
import { appConfig } from "./app-config";

export type SqlValue = string | number | boolean | null;
// A small interface also lets tests replace the database boundary.
export interface Database {
    execute<T>(sql: string, values?: SqlValue[]): Promise<T>;
}
// Shares a pool of MySQL connections across application services.
class Dal implements Database {
    private readonly pool = mysql.createPool({
        host: appConfig.mysqlHost,
        port: appConfig.mysqlPort,
        user: appConfig.mysqlUser,
        password: appConfig.mysqlPassword,
        database: appConfig.mysqlDatabase,
        connectionLimit: 10,
        dateStrings: true,
        decimalNumbers: true,
    });

    // Runs a parameterized SQL query and returns its result.
    public async execute<T>(sql: string, values: SqlValue[] = []): Promise<T> {
        const [result] = await this.pool.execute<QueryResult>(sql, values);
        return result as T;
    }

    // Closes the database connection pool.
    public async close(): Promise<void> {
        await this.pool.end();
    }
}
export const dal = new Dal();
