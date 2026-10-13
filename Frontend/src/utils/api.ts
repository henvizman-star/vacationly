import { HttpStatus } from "../models/enums";
import axios from "axios";
import { store } from "../redux/store";
import { userSlice } from "../redux/user-slice";

export const tokenKey = "vacationly-token";
// A dedicated instance keeps the token on requests to our own API only.
export const api = axios.create({ baseURL: "/api", timeout: 15000 });
// Adds the saved token to requests sent through this API client.
api.interceptors.request.use((request) => {
    const token = localStorage.getItem(tokenKey);
    if (token) request.headers.Authorization = "Bearer " + token;
    return request;
});
// Clears the session when a protected request fails authentication.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            axios.isAxiosError(error) &&
            error.response?.status === HttpStatus.Unauthorized &&
            !["/login", "/register"].includes(error.config?.url ?? "")
        ) {
            localStorage.removeItem(tokenKey);
            store.dispatch(userSlice.actions.signOut());
        }
        return Promise.reject(error);
    },
);
// Converts API and network failures into messages suitable for the UI.
export function errorMessage(error: unknown): string {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        if (!error.response) return "We couldn't reach the server. Please try again.";
        return error.response.data?.message ?? "Something went wrong. Please try again.";
    }
    return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
