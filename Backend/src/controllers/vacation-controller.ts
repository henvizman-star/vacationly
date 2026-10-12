import { HttpStatus } from "../models/enums";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { securityMiddleware } from "../middleware/security-middleware";
import { vacationCreateSchema, vacationUpdateSchema, vacationQuerySchema } from "../models/vacation-model";
import { vacationService } from "../services/vacation-service";
import { uploadMiddleware } from "../middleware/upload-middleware";
import { imageStorage } from "../utils/image-storage";

class VacationController {
    public readonly router = Router();

    // Registers vacation routes and requires a regular user for like changes.
    public constructor() {
        this.router.get("/api/vacations", securityMiddleware.verifyLoggedIn, this.getPage);
        // Register fixed report paths before the dynamic vacation identifier.
        this.router.get("/api/vacations/report", securityMiddleware.verifyLoggedIn, securityMiddleware.verifyAdmin, this.report);
        this.router.get("/api/vacations/report.csv", securityMiddleware.verifyLoggedIn, securityMiddleware.verifyAdmin, this.csv);
        this.router.get("/api/vacations/:id", securityMiddleware.verifyLoggedIn, securityMiddleware.verifyAdmin, this.getOne);
        this.router.put("/api/vacations/:id", securityMiddleware.verifyLoggedIn, securityMiddleware.verifyAdmin, uploadMiddleware, this.update);
        this.router.delete("/api/vacations/:id", securityMiddleware.verifyLoggedIn, securityMiddleware.verifyAdmin, this.remove);
        this.router.post("/api/vacations", securityMiddleware.verifyLoggedIn,
            securityMiddleware.verifyAdmin, uploadMiddleware, this.add);
        this.router.put("/api/vacations/:id/like", securityMiddleware.verifyLoggedIn, securityMiddleware.verifyUser, this.addLike);
        this.router.delete("/api/vacations/:id/like", securityMiddleware.verifyLoggedIn, securityMiddleware.verifyUser, this.removeLike);
    }

    // Validate identifiers for all administrator actions before building SQL.
    private async getOne(request: Request, response: Response): Promise<void> {
        const id = z.coerce.number().int().positive().parse(request.params.id);
        response.json(await vacationService.getOne(id));
    }

    private async update(request: Request, response: Response): Promise<void> {
        const id = z.coerce.number().int().positive().parse(request.params.id);
        const vacation = vacationUpdateSchema.parse(request.body);
        const image = imageStorage.getImage(request.files, false);
        response.json(await vacationService.update(id, vacation, image));
    }

    private async remove(request: Request, response: Response): Promise<void> {
        const id = z.coerce.number().int().positive().parse(request.params.id);
        await vacationService.remove(id);
        response.sendStatus(HttpStatus.NoContent);
    }

    // Both graph data and downloads use the same full-dataset report query.
    private async report(_request: Request, response: Response): Promise<void> {
        response.json(await vacationService.getReport());
    }

    private async csv(_request: Request, response: Response): Promise<void> {
        response.type("text/csv; charset=utf-8").attachment("vacation-likes.csv").send(await vacationService.getCsv());
    }

    // Authorize before parsing uploads; validate fields before writing any image or row.
    private async add(request: Request, response: Response): Promise<void> {
        const vacation = vacationCreateSchema.parse(request.body);
        const image = imageStorage.getImage(request.files)!;
        response.status(HttpStatus.Created).json(await vacationService.add(vacation, image));
    }

    // Validates the requested filter and page, then returns vacations.
    private async getPage(request: Request, response: Response): Promise<void> {
        const query = vacationQuerySchema.parse(request.query);
        response.json(await vacationService.getPage(response.locals.user.id, query));
    }

    // Validates the vacation ID and adds the current user's like.
    private async addLike(request: Request, response: Response): Promise<void> {
        const id = z.coerce.number().int().positive().parse(request.params.id);
        await vacationService.setLike(response.locals.user.id, id, true);
        response.sendStatus(HttpStatus.NoContent);
    }

    // Validates the vacation ID and removes the current user's like.
    private async removeLike(request: Request, response: Response): Promise<void> {
        const id = z.coerce.number().int().positive().parse(request.params.id);
        await vacationService.setLike(response.locals.user.id, id, false);
        response.sendStatus(HttpStatus.NoContent);
    }
}
export const vacationController = new VacationController();
