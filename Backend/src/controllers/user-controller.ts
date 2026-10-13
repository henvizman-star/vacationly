import { HttpStatus } from "../models/enums";
import { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { credentialsSchema, registrationSchema } from "../models/user-model";
import { userService } from "../services/user-service";
import { securityMiddleware } from "../middleware/security-middleware";

class UserController {
    public readonly router = Router();

    // Registers user routes, limits authentication attempts, and protects /api/me.
    public constructor() {
        const limit = rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 50,

            statusCode: HttpStatus.TooManyRequests,
            standardHeaders: "draft-8",
            legacyHeaders: false,
            message: { message: "Too many attempts. Please try again later." },
        });

        this.router.post("/api/register", limit, this.register);
        this.router.post("/api/login", limit, this.login);
        this.router.get("/api/me", securityMiddleware.verifyLoggedIn, (_request, response) => {
            response.json(response.locals.user);
        });
    }

    // Validates registration input and returns the new user's token with HTTP 201.
    private async register(request: Request, response: Response): Promise<void> {
        const user = registrationSchema.parse(request.body);
        response.status(HttpStatus.Created).json(await userService.register(user));
    }

    // Validates login input and returns a token for valid credentials.
    private async login(request: Request, response: Response): Promise<void> {
        const credentials = credentialsSchema.parse(request.body);
        response.json(await userService.login(credentials));
    }
}

export const userController = new UserController();
