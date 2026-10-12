import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UserModel } from "../models/user-model";

export type AuthState = { user: UserModel | null; ready: boolean; error: string };
const initialState: AuthState = { user: null, ready: false, error: "" };
// Keeps the current user, session readiness, and restoration error in shared state.
export const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        signIn: (_state, action: PayloadAction<UserModel>): AuthState => ({ user: action.payload, ready: true, error: "" }),
        signOut: (): AuthState => ({ user: null, ready: true, error: "" }),
        restoreFailed: (_state, action: PayloadAction<string>): AuthState => ({ user: null, ready: true, error: action.payload })
    }
});
