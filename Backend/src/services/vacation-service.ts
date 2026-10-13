import { HttpStatus } from "../models/enums";
import type { ResultSetHeader } from "mysql2";
import type { UploadedFile } from "express-fileupload";
import { ClientError } from "../models/client-error";
import type {
    VacationInput,
    VacationModel,
    VacationPage,
    VacationQuery,
} from "../models/vacation-model";
import { dal, type Database, type SqlValue } from "../utils/dal";
import { imageStorage, isUploadedImageName, type ImageStorage } from "../utils/image-storage";

export class VacationService {
    // Accepts a database dependency so tests can replace the real MySQL pool.
    public constructor(
        private readonly database: Database = dal,
        private readonly images: Pick<ImageStorage, "save" | "remove"> = imageStorage,
    ) {}

    // Read one vacation for the administrator's pre-filled editing form.
    public async getOne(id: number): Promise<VacationModel> {
        const rows = await this.database.execute<VacationModel[]>(
            `SELECT v.*, (SELECT COUNT(*) FROM likes l WHERE l.vacationId = v.id) AS likesCount
             FROM vacations v WHERE v.id = ?`,
            [id],
        );
        if (!rows[0]) throw new ClientError(HttpStatus.NotFound, "Vacation not found.");
        const row = rows[0];
        return {
            ...row,
            price: Number(row.price),
            likesCount: Number(row.likesCount),
            isLiked: false,
            imageUrl: "/api/vacations/images/" + encodeURIComponent(row.imageName),
        };
    }

    // Keep the old image unless a new file is supplied; reject a concurrent replacement.
    public async update(
        id: number,
        vacation: VacationInput,
        image?: UploadedFile,
    ): Promise<VacationModel> {
        const previous = await this.getOne(id);
        const imageName = image ? await this.images.save(image) : previous.imageName;
        try {
            const result = await this.database.execute<ResultSetHeader>(
                `UPDATE vacations SET destination = ?, country = ?, continent = ?, description = ?,
                 startDate = ?, endDate = ?, price = ?, imageName = ? WHERE id = ? AND imageName = ?`,
                [
                    vacation.destination,
                    vacation.country,
                    vacation.continent,
                    vacation.description,
                    vacation.startDate,
                    vacation.endDate,
                    vacation.price,
                    imageName,
                    id,
                    previous.imageName,
                ],
            );
            if (!result.affectedRows)
                throw new ClientError(
                    HttpStatus.Conflict,
                    "Vacation changed or was deleted. Reload before saving.",
                );
        } catch (error) {
            if (image) await this.cleanupImage(imageName);
            throw error;
        }
        if (image) await this.cleanupImage(previous.imageName);
        return {
            ...previous,
            ...vacation,
            imageName,
            imageUrl: "/api/vacations/images/" + encodeURIComponent(imageName),
        };
    }

    // Foreign keys remove the likes; remove only this vacation's generated upload afterward.
    public async remove(id: number): Promise<void> {
        const previous = await this.getOne(id);
        const result = await this.database.execute<ResultSetHeader>(
            "DELETE FROM vacations WHERE id = ? AND imageName = ?",
            [id, previous.imageName],
        );
        if (!result.affectedRows)
            throw new ClientError(
                HttpStatus.Conflict,
                "Vacation changed or was deleted. Reload before deleting.",
            );
        await this.cleanupImage(previous.imageName);
    }

    // A file cleanup failure must not disguise a successful database update or its original error.
    private async cleanupImage(name: string): Promise<void> {
        if (!isUploadedImageName(name)) return;
        try {
            await this.images.remove(name);
        } catch (error) {
            console.error(
                "Image cleanup failed:",
                error instanceof Error ? error.name : "Unknown error",
            );
        }
    }

    // Reports cover every vacation, including zero likes and repeated destination names.
    public async getReport(): Promise<{ id: number; destination: string; likes: number }[]> {
        const rows = await this.database.execute<
            { id: number; destination: string; likes: number }[]
        >(
            `SELECT v.id, v.destination, (SELECT COUNT(*) FROM likes l WHERE l.vacationId = v.id) AS likes
             FROM vacations v ORDER BY v.startDate, v.id`,
        );
        return rows.map((row) => ({ ...row, likes: Number(row.likes) }));
    }

    // Quote CSV values and neutralize spreadsheet formulas without changing the database.
    public async getCsv(): Promise<string> {
        const rows = await this.getReport();
        const cell = (value: string) =>
            '"' + (/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
        return (
            "\uFEFFDestination,Likes\r\n" +
            rows.map((row) => cell(row.destination) + "," + row.likes).join("\r\n") +
            "\r\n"
        );
    }

    // Save a validated vacation. The database stores only the generated image filename.
    public async add(vacation: VacationInput, image: UploadedFile): Promise<VacationModel> {
        const imageName = await this.images.save(image);
        let id: number;
        try {
            const result = await this.database.execute<ResultSetHeader>(
                `INSERT INTO vacations (destination, country, continent, description, startDate, endDate, price, imageName)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    vacation.destination,
                    vacation.country,
                    vacation.continent,
                    vacation.description,
                    vacation.startDate,
                    vacation.endDate,
                    vacation.price,
                    imageName,
                ],
            );
            id = result.insertId;
        } catch (error) {
            // Undo file creation if the database rejects the insert.
            try {
                await this.images.remove(imageName);
            } catch (cleanupError) {
                console.error(
                    "Image cleanup failed:",
                    cleanupError instanceof Error ? cleanupError.name : "Unknown error",
                );
            }
            throw error;
        }
        return {
            ...vacation,
            id,
            imageName,
            imageUrl: "/api/vacations/images/" + encodeURIComponent(imageName),
            likesCount: 0,
            isLiked: false,
        };
    }

    // Returns one page of vacations, sorted by start date,
    // with filtering, like counts, and the current user's like status.
    public async getPage(userId: number, query: VacationQuery): Promise<VacationPage> {
        let where = "1 = 1";
        const values: SqlValue[] = [];
        if (query.filter === "liked") {
            where =
                "EXISTS (SELECT 1 FROM likes mine WHERE mine.vacationId = v.id AND mine.userId = ?)";
            values.push(userId);
        }

        // The database defines today once, using the same UTC date as seed data.
        if (query.filter === "active")
            where = "v.startDate <= UTC_DATE() AND v.endDate >= UTC_DATE()";
        if (query.filter === "upcoming") where = "v.startDate > UTC_DATE()";
        const counts = await this.database.execute<{ total: number }[]>(
            "SELECT COUNT(*) AS total FROM vacations v WHERE " + where,
            values,
        );

        const total = Number(counts[0].total);
        const pageSize = 9;
        const totalPages = Math.ceil(total / pageSize);
        const page = Math.min(query.page, Math.max(1, totalPages));

        // Only validated integers are interpolated for LIMIT/OFFSET.
        const rows = await this.database.execute<
            (Omit<VacationModel, "imageUrl" | "isLiked"> & { isLiked: number })[]
        >(
            `SELECT v.*, (SELECT COUNT(*) FROM likes l WHERE l.vacationId = v.id) AS likesCount,
             EXISTS (SELECT 1 FROM likes mine WHERE mine.vacationId = v.id AND mine.userId = ?) AS isLiked
             FROM vacations v WHERE ${where}
             ORDER BY v.startDate ASC, v.id ASC LIMIT 9 OFFSET ${(page - 1) * pageSize}`,
            [userId, ...values],
        );

        const vacations = rows.map((row) => ({
            ...row,
            price: Number(row.price),
            likesCount: Number(row.likesCount),
            isLiked: Boolean(row.isLiked),
            imageUrl: "/api/vacations/images/" + encodeURIComponent(row.imageName),
        }));
        return { vacations, total, page, pageSize, totalPages };
    }

    // Adds or removes a user's like for an existing vacation.
    // Ignores a duplicate like and reports a missing vacation.
    public async setLike(userId: number, vacationId: number, liked: boolean): Promise<void> {
        const rows = await this.database.execute<{ id: number }[]>(
            "SELECT id FROM vacations WHERE id = ?",
            [vacationId],
        );
        if (!rows[0]) throw new ClientError(HttpStatus.NotFound, "Vacation not found.");
        if (liked) {
            try {
                await this.database.execute(
                    "INSERT INTO likes (userId, vacationId) VALUES (?, ?)",
                    [userId, vacationId],
                );
            } catch (error) {
                if ((error as { code?: string }).code === "ER_DUP_ENTRY") return;
                if ((error as { code?: string }).code === "ER_NO_REFERENCED_ROW_2") {
                    throw new ClientError(
                        HttpStatus.NotFound,
                        "Vacation or account no longer exists.",
                    );
                }
                throw error;
            }
        } else {
            await this.database.execute("DELETE FROM likes WHERE userId = ? AND vacationId = ?", [
                userId,
                vacationId,
            ]);
        }
    }
}
export const vacationService = new VacationService();
