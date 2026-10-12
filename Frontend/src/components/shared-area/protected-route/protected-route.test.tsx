import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { userSlice } from "../../../redux/user-slice";
import { ProtectedRoute } from "./protected-route";
describe("ProtectedRoute", () => {
    it("redirects a guest before protected content renders", () => {
        const store = configureStore({ reducer: { auth: userSlice.reducer } });
        store.dispatch(userSlice.actions.signOut());
        render(<Provider store={store}><MemoryRouter initialEntries={["/vacations"]}><Routes>
            <Route path="/login" element={<h1>Sign in</h1>}/>
            <Route element={<ProtectedRoute/>}><Route path="/vacations" element={<h1>Private collection</h1>}/></Route>
        </Routes></MemoryRouter></Provider>);
        expect(screen.getByRole("heading", { name: "Sign in" })).toBeVisible();
        expect(screen.queryByText("Private collection")).not.toBeInTheDocument();
    });
});
