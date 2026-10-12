import type { RequestHandler } from "express";
import { ClientError } from "../models/client-error";
import { HttpStatus, Role } from "../models/enums";
import { cyber } from "../utils/cyber";
import { userService } from "../services/user-service";

class SecurityMiddleware {

    // Verifies the token and loads the current MySQL user before protected routes.
    public verifyLoggedIn: RequestHandler = async (request, response, next) => {
        const match = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? "");

        if (!match) throw new ClientError(HttpStatus.Unauthorized, "Please sign in to continue.");
        let id: number;
        try { id = cyber.readToken(match[1]).id; }
        catch { throw new ClientError(HttpStatus.Unauthorized, "Your session has expired. Please sign in again."); }

        // Check the current account and role, not only the old token claims.
        response.locals.user = await userService.getOne(id);
        next();
    };

    // Allows only administrators to continue.
    public verifyAdmin: RequestHandler = (_request, response, next) => {
        if (response.locals.user.roleId !== Role.Admin) throw new ClientError(HttpStatus.Forbidden, "Administrator access required.");
        next();
    };

    // Allows only regular users to continue.
    public verifyUser: RequestHandler = (_request, response, next) => {
        if (response.locals.user.roleId !== Role.User) throw new ClientError(HttpStatus.Forbidden, "Administrators cannot like vacations.");
        next();
    };
}
export const securityMiddleware = new SecurityMiddleware();
