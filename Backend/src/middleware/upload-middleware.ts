import fileUpload from "express-fileupload";
import { ClientError } from "../models/client-error";
import { HttpStatus } from "../models/enums";
import { maxImageBytes } from "../utils/image-storage";

// Mount only on vacation write routes AFTER authentication and administrator checks.
// Keep small files in memory until all input is validated, avoiding orphan temporary files.
export const uploadMiddleware = fileUpload({
    limits: { fileSize: maxImageBytes, files: 2, fields: 8, fieldSize: 64 * 1024 },
    // Retain up to two files so getImage can detect and reject multiple uploads.
    useTempFiles: false,
    parseNested: false,
    limitHandler: (_request, _response, next) => {
        next(new ClientError(HttpStatus.PayloadTooLarge, "Image must be no larger than 5 MB."));
    },
});
