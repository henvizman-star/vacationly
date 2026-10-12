import { HttpStatus } from "./models/enums";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { userController } from "./controllers/user-controller";
import { vacationController } from "./controllers/vacation-controller";
import { aiController } from "./controllers/ai-controller";
import { errorMiddleware } from "./middleware/error-middleware";
import { appConfig } from "./utils/app-config";
import { dal } from "./utils/dal";

// Creating the Express app does not open a port; tests can import it safely.
export function createServer() {
    
    const server = express();

    server.disable("x-powered-by");
    server.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
    server.use(cors({ origin: appConfig.clientOrigin }));
    server.use(express.json({ limit: "32kb" }));
    
    // Reports whether the API can reach MySQL, not merely whether HTTP is running.
    server.get("/api/health", async (_request, response) => {
        try {
            await dal.execute("SELECT 1");
            response.json({ status: "ok", database: "connected" });
        } catch {
            response.status(HttpStatus.ServiceUnavailable).json({ status: "unavailable", database: "disconnected" });
        }
    });
    server.use("/api/vacations/images", express.static(appConfig.uploadsPath, { index: false, dotfiles: "deny" }));
    server.use("/api/vacations/images", express.static(appConfig.imagesPath, { index: false, dotfiles: "deny" }));
    server.use(userController.router);
    server.use(vacationController.router);
    server.use(aiController.router);
    server.use(errorMiddleware.routeNotFound);
    server.use(errorMiddleware.catchAll);
    return server;
}
