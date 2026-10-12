import { HttpStatus } from "../models/enums";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ClientError } from "../models/client-error";

class ErrorMiddleware {
    // Turns unmatched routes into the same structured errors as other failures.
    public routeNotFound: RequestHandler = (_request, _response, next) => {
        next(new ClientError(HttpStatus.NotFound, "This endpoint does not exist."));
    };
    // Maps validation, expected client, and unexpected errors to JSON responses.
    public catchAll: ErrorRequestHandler = (error: unknown, _request, response, next) => {
        if (response.headersSent) { next(error); return; }
        if (error instanceof ZodError) {
            response.status(HttpStatus.UnprocessableEntity).json({ message: error.issues[0].message });
        } else if (error instanceof ClientError) {
            response.status(error.status).json({ message: error.message });
        } else if (error instanceof SyntaxError && "status" in error && error.status === HttpStatus.BadRequest) {
            response.status(HttpStatus.BadRequest).json({ message: "The request must contain valid JSON." });
        } else {
            
            // Unexpected errors (including database failures) return a generic HTTP 500 message.
            // Never expose internal error details or SQL messages to the client; log only the error name here.
            console.error("Request failed:", error instanceof Error ? error.name : "Unknown error");
            response.status(HttpStatus.InternalServerError).json({ message: "Something went wrong. Please try again." });
        }
    };
}
export const errorMiddleware = new ErrorMiddleware();
