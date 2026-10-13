import { createServer } from "./server";
import { appConfig } from "./utils/app-config";
import { dal } from "./utils/dal";

// Confirms MySQL is reachable before opening the HTTP port.
async function start(): Promise<void> {
    await dal.execute("SELECT 1");
    const server = createServer().listen(appConfig.port, () => {
        console.log("Vacationly API: http://localhost:" + appConfig.port);
    });
    // Releases the HTTP listener and database pool on process shutdown.
    const shutdown = () =>
        server.close(() => {
            void dal.close();
        });
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}
start().catch(() => {
    console.error(
        "Could not connect to MySQL. Check Backend/.env and initialize Database/01-schema.sql.",
    );
    void dal.close();
    process.exitCode = 1;
});
