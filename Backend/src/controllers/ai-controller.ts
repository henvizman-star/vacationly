import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { securityMiddleware } from "../middleware/security-middleware";
import { aiService } from "../services/ai-service";
import { HttpStatus } from "../models/enums";

class AiController {
    public readonly router = Router();
    public constructor() {
        // Authenticate before invoking a paid provider; limit repeated calls per client IP.
        const limit = rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 20,
            statusCode: HttpStatus.TooManyRequests,
            message: { message: "Too many AI requests. Please try again later." },
        });
        this.router.post(
            "/api/ai/recommendation",
            securityMiddleware.verifyLoggedIn,
            limit,
            async (request, response) => {
                const { destination } = z
                    .object({ destination: z.string().trim().min(1).max(200) })
                    .parse(request.body);
                response.json({ answer: await aiService.recommend(destination) });
            },
        );
        this.router.post(
            "/api/ai/question",
            securityMiddleware.verifyLoggedIn,
            limit,
            async (request, response) => {
                const { question } = z
                    .object({ question: z.string().trim().min(1).max(1000) })
                    .parse(request.body);
                response.json({ answer: await aiService.ask(question) });
            },
        );
    }
}
export const aiController = new AiController();
