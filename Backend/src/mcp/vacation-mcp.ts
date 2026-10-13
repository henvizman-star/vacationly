import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { dal, type Database, type SqlValue } from "../utils/dal";

// Only read-only, bounded vacation queries are available; no raw SQL or user data tools.
const filters = {
    status: z.enum(["all", "active", "upcoming", "past"]).default("all"),
    country: z.string().trim().max(100).nullable().optional(),
    continent: z.string().trim().max(30).nullable().optional(),
    destination: z.string().trim().max(100).nullable().optional(),
    minPrice: z.number().min(0).max(10000).nullable().optional(),
    maxPrice: z.number().min(0).max(10000).nullable().optional(),
};
const filterSchema = z.object(filters);

// SQL structure is fixed by the application; model-provided values remain parameters.
function where(input: z.infer<typeof filterSchema>) {
    const conditions = ["1 = 1"];
    const values: SqlValue[] = [];
    if (input.status === "active")
        conditions.push("startDate <= UTC_DATE() AND endDate >= UTC_DATE()");
    if (input.status === "upcoming") conditions.push("startDate > UTC_DATE()");
    if (input.status === "past") conditions.push("endDate < UTC_DATE()");
    for (const key of ["country", "continent", "destination"] as const) {
        if (input[key]) {
            conditions.push(key + " = ?");
            values.push(input[key]);
        }
    }
    if (input.minPrice != null) {
        conditions.push("price >= ?");
        values.push(input.minPrice);
    }
    if (input.maxPrice != null) {
        conditions.push("price <= ?");
        values.push(input.maxPrice);
    }
    return { sql: conditions.join(" AND "), values };
}

// A fresh server per request avoids sharing MCP session state between signed-in users.
export function createVacationMcp(database: Database = dal): McpServer {
    const server = new McpServer({ name: "vacationly", version: "1.0.0" });
    server.registerTool(
        "vacation_statistics",
        {
            description:
                "Count vacations and calculate average/minimum/maximum prices in USD. Filters apply to the entire database. Active includes both boundary dates in UTC.",
            inputSchema: filters,
            annotations: { readOnlyHint: true, destructiveHint: false },
        },
        async (input) => {
            const query = where(input);
            const rows = await database.execute<Record<string, unknown>[]>(
                "SELECT COUNT(*) AS count, AVG(price) AS averagePrice, MIN(price) AS minPrice, MAX(price) AS maxPrice FROM vacations WHERE " +
                    query.sql,
                query.values,
            );
            return { content: [{ type: "text", text: JSON.stringify(rows[0]) }] };
        },
    );
    server.registerTool(
        "search_vacations",
        {
            description:
                "List vacation details and like counts matching optional status, country, continent, exact destination and price filters. Use continent Europe for European countries. Results include total match count and at most 50 rows.",
            inputSchema: {
                ...filters,
                limit: z.number().int().min(1).max(50).default(50),
                offset: z.number().int().min(0).max(100000).default(0),
            },
            annotations: { readOnlyHint: true, destructiveHint: false },
        },
        async (input) => {
            const query = where(input);
            const counts = await database.execute<{ count: number }[]>(
                "SELECT COUNT(*) AS count FROM vacations WHERE " + query.sql,
                query.values,
            );
            const rows = await database.execute<Record<string, unknown>[]>(
                `SELECT id, destination, country, continent, description, startDate, endDate, price,
             (SELECT COUNT(*) FROM likes l WHERE l.vacationId = vacations.id) AS likesCount
             FROM vacations WHERE ${query.sql} ORDER BY startDate, id LIMIT ${input.limit} OFFSET ${input.offset}`,
                query.values,
            );
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            total: Number(counts[0].count),
                            offset: input.offset,
                            vacations: rows,
                        }),
                    },
                ],
            };
        },
    );
    return server;
}

// This transport carries real MCP initialization, discovery and JSON-RPC tool calls in-process.
// Keeping it internal means public callers must pass the Express authentication middleware.
export async function withVacationMcp<T>(
    work: (client: Client) => Promise<T>,
    database: Database = dal,
): Promise<T> {
    const server = createVacationMcp(database);
    const client = new Client({ name: "vacationly-api", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    try {
        await server.connect(serverTransport);
        await client.connect(clientTransport);
        return await work(client);
    } finally {
        await client.close();
        await server.close();
    }
}
