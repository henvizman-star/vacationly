import type { VacationFilter, VacationInput, VacationModel, VacationPage } from "../models/vacation-model";
import { api } from "../utils/api";

class VacationService {
    // Editing loads the current server record, rather than relying on stale card props.
    public async getOne(id: number, signal?: AbortSignal): Promise<VacationModel> {
        return (await api.get<VacationModel>("/vacations/" + id, { signal })).data;
    }

    public async update(id: number, vacation: VacationInput, image?: File): Promise<VacationModel> {
        const form = new FormData();
        for (const [key, value] of Object.entries(vacation)) form.append(key, String(value));
        if (image) form.append("image", image);
        return (await api.put<VacationModel>("/vacations/" + id, form, { timeout: 60000 })).data;
    }

    public async remove(id: number): Promise<void> {
        await api.delete("/vacations/" + id);
    }

    public async getReport(): Promise<{ id: number; destination: string; likes: number }[]> {
        return (await api.get("/vacations/report")).data;
    }

    // Download through Axios so the protected CSV request receives the Bearer token.
    public async downloadReport(): Promise<void> {
        const response = await api.get("/vacations/report.csv", { responseType: "blob" });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = "vacation-likes.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Send text fields and the image together; the browser supplies the multipart boundary.
    public async add(vacation: VacationInput, image: File): Promise<VacationModel> {
        const form = new FormData();
        for (const [key, value] of Object.entries(vacation)) form.append(key, String(value));
        form.append("image", image);
        const response = await api.post<VacationModel>("/vacations", form, { timeout: 60000 });
        return response.data;
    }

    // Requests a filtered, paginated list; the signal can cancel an obsolete request.
    public async getPage(filter: VacationFilter, page: number, signal?: AbortSignal): Promise<VacationPage> {
        const response = await api.get<VacationPage>("/vacations", { params: { filter, page }, signal });
        return response.data;
    }
    // Adds a like with PUT or removes it with DELETE for one vacation.
    public async setLike(id: number, liked: boolean): Promise<void> {
        const url = "/vacations/" + id + "/like";
        if (liked) await api.put(url);
        else await api.delete(url);
    }
}
export const vacationService = new VacationService();
