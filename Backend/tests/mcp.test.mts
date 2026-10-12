import { test } from "node:test";
import assert from "node:assert/strict";
process.env.JWT_SECRET = "test-only-secret-never-used-outside-test-suite";
process.env.MYSQL_PASSWORD = "test-only";
const { withVacationMcp } = await import("../src/mcp/vacation-mcp");

test("MCP initialization, discovery and tool calls preserve filters and parameterize input", async () => {
    const queries: { sql: string; values?: unknown[] }[] = [];
    await withVacationMcp(async client => {
        const { tools } = await client.listTools();
        assert.deepEqual(tools.map(tool => tool.name).sort(), ["search_vacations", "vacation_statistics"]);
        const stats = await client.callTool({ name: "vacation_statistics", arguments: { status: "active" } });
        assert.notEqual(stats.isError, true);
        assert.match(queries[0].sql, /startDate <= UTC_DATE\(\) AND endDate >= UTC_DATE\(\)/);
        const destination = "Rome'; DROP TABLE users; --";
        const search = await client.callTool({ name: "search_vacations", arguments: { status: "upcoming", continent: "Europe", destination } });
        assert.notEqual(search.isError, true);
        assert.match(queries[1].sql, /startDate > UTC_DATE\(\)/);
        assert.deepEqual(queries[1].values, ["Europe", destination]);
        assert.equal(queries[1].sql.includes(destination), false);
        const before = queries.length;
        const bad = await client.callTool({ name: "search_vacations", arguments: { limit: 1000000 } });
        assert.equal(bad.isError, true);
        assert.equal(queries.length, before);
    }, { execute: async <T>(sql: string, values?: unknown[]) => {
        queries.push({ sql, values });
        return (sql.includes("COUNT(*) AS count") ? [{ count: 0, averagePrice: null }] : []) as T;
    } });
});
