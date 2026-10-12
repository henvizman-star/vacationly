import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FileArray, UploadedFile } from "express-fileupload";
import { ClientError } from "../models/client-error";
import { HttpStatus } from "../models/enums";
import { appConfig } from "./app-config";

export const maxImageBytes = 5 * 1024 * 1024;

// Seed assets are shared references; only generated upload filenames may be deleted.
export function isUploadedImageName(name: string): boolean {
    return /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(jpg|png)$/.test(name);
}

export class ImageStorage {
    public constructor(private readonly directory = appConfig.uploadsPath) {}

    // Accept exactly one image field. Editing may omit it to keep the existing image.
    public getImage(files: FileArray | null | undefined, required = true): UploadedFile | undefined {
        if (!files || Object.keys(files).length === 0) {
            if (required) throw new ClientError(HttpStatus.UnprocessableEntity, "A vacation image is required.");
            return undefined;
        }
        if (Object.keys(files).length !== 1 || !files.image || Array.isArray(files.image)) {
            throw new ClientError(HttpStatus.UnprocessableEntity, "Upload one file in the image field.");
        }
        return files.image;
    }

    // Check size, declared MIME type and file signature; this is not full image decoding.
    private extension(file: UploadedFile): "jpg" | "png" {
        if (file.truncated || file.size > maxImageBytes || file.data.length > maxImageBytes) {
            throw new ClientError(HttpStatus.PayloadTooLarge, "Image must be no larger than 5 MB.");
        }
        const data = file.data;
        if (!file.size || !data.length) {
            throw new ClientError(HttpStatus.UnprocessableEntity, "The image file is empty.");
        }
        if (file.mimetype === "image/jpeg" && data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "jpg";
        if (file.mimetype === "image/png" && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
        throw new ClientError(HttpStatus.UnprocessableEntity, "Upload a JPEG or PNG image.");
    }

    // Return only the generated filename for storage in MySQL; ignore the submitted filename.
    public async save(file: UploadedFile): Promise<string> {
        const imageName = randomUUID() + "." + this.extension(file);
        await fs.mkdir(this.directory, { recursive: true });
        const destination = path.join(this.directory, imageName);
        // Exclusive creation prevents overwriting an existing image.
        const handle = await fs.open(destination, "wx");
        try {
            await handle.writeFile(file.data);
        } catch (error) {
            await handle.close();
            await fs.unlink(destination);
            throw error;
        }
        await handle.close();
        return imageName;
    }

    // Remove only generated uploads, for example when the subsequent database insert fails.
    public async remove(imageName: string): Promise<void> {
        if (!isUploadedImageName(imageName)) {
            throw new ClientError(HttpStatus.BadRequest, "Invalid uploaded image name.");
        }
        try { await fs.unlink(path.join(this.directory, imageName)); }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
    }
}

export const imageStorage = new ImageStorage();
