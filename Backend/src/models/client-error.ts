import { HttpStatus } from "./enums";

// Carries an HTTP status for errors the client can handle or correct.
export class ClientError extends Error {
    public constructor(
        public readonly status: HttpStatus,
        message: string,
    ) {
        super(message);
        this.name = "ClientError";
    }
}
