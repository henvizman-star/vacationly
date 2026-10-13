import { jwtDecode } from "jwt-decode";
import type { CredentialsModel, RegistrationModel, UserModel } from "../models/user-model";
import { store } from "../redux/store";
import { userSlice } from "../redux/user-slice";
import { api, errorMessage, tokenKey } from "../utils/api";

class UserService {
    // Restores a saved session by checking its token with the API.
    public async restoreSession(): Promise<void> {
        const token = localStorage.getItem(tokenKey);
        if (!token) {
            store.dispatch(userSlice.actions.signOut());
            return;
        }
        try {
            const { exp } = jwtDecode<{ exp: number }>(token);
            if (!exp || exp * 1000 <= Date.now()) {
                this.logout();
                return;
            }
        } catch {
            this.logout();
            return;
        }

        try {
            const response = await api.get<UserModel>("/me");
            store.dispatch(userSlice.actions.signIn(response.data));
        } catch (error) {
            store.dispatch(userSlice.actions.restoreFailed(errorMessage(error)));
        }
    }

    // Sends login details to the API and saves the returned token.
    public async login(credentials: CredentialsModel): Promise<void> {
        const response = await api.post<string>("/login", credentials);
        this.saveToken(response.data);
    }

    // Sends registration details to the API and saves the returned token.
    public async register(user: RegistrationModel): Promise<void> {
        const response = await api.post<string>("/register", user);
        this.saveToken(response.data);
    }

    // Stores the token and updates the signed-in user in Redux.
    private saveToken(token: string): void {
        const { user } = jwtDecode<{ user: UserModel }>(token);
        localStorage.setItem(tokenKey, token);
        store.dispatch(userSlice.actions.signIn(user));
    }

    // Removes the saved token and clears the signed-in user.
    public logout(): void {
        localStorage.removeItem(tokenKey);
        store.dispatch(userSlice.actions.signOut());
    }
}
export const userService = new UserService();
