import { configureStore } from "@reduxjs/toolkit";
import { userSlice } from "./user-slice";
// Combines application state; authentication is currently the only shared slice.
export const store = configureStore({ reducer: { auth: userSlice.reducer } });
export type AppState = ReturnType<typeof store.getState>;
