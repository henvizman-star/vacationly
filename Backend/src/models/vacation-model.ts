import { z } from "zod";

// Validates the requested vacation filter and page before building SQL.
export const vacationQuerySchema = z.object({
    filter: z.enum(["all", "liked", "active", "upcoming"]).default("all"),
    page: z.coerce.number().int().min(1).max(100000).default(1)
});
export type VacationQuery = z.infer<typeof vacationQuerySchema>;

// Shared fields for creation and editing; image uploads are validated separately.
export const vacationInputSchema = z.object({
    destination: z.string().trim().min(1).max(100),
    country: z.string().trim().min(1).max(100),
    continent: z.string().trim().min(1).max(30),
    // Stay below MySQL TEXT's byte limit even with four-byte Unicode characters.
    description: z.string().trim().min(1).max(10000),
    startDate: z.iso.date("Enter a valid start date (YYYY-MM-DD)."),
    endDate: z.iso.date("Enter a valid end date (YYYY-MM-DD)."),
    // Reject blank input before conversion, since Number("") would otherwise become zero.
    price: z.union([z.number(), z.string().trim().min(1)])
        .pipe(z.coerce.number<string | number>().min(0).max(10000).multipleOf(0.01))
}).refine(vacation => vacation.endDate >= vacation.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"]
});

// Editing allows past vacations; creation additionally rejects past start dates.
export const vacationUpdateSchema = vacationInputSchema;
export const vacationCreateSchema = vacationInputSchema.refine(
    vacation => vacation.startDate >= new Date().toISOString().slice(0, 10),
    { message: "Start date cannot be in the past.", path: ["startDate"] }
);
// Calculate today for each validation, using UTC like the vacation filters in MySQL.
export type VacationInput = z.infer<typeof vacationInputSchema>;

// A vacation returned by the API, including derived image and like fields.
export type VacationModel = {
    id: number; destination: string; country: string; continent: string;
    description: string; startDate: string; endDate: string; price: number;
    imageName: string; imageUrl: string; likesCount: number; isLiked: boolean;
};
// Pagination metadata lets the client render navigation and result counts.
export type VacationPage = {
    vacations: VacationModel[]; total: number; page: number; pageSize: number; totalPages: number;
};
