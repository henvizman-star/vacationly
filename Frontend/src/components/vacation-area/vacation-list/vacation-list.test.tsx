import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { afterEach, expect, it, vi } from "vitest";
import { store } from "../../../redux/store";
import { userSlice } from "../../../redux/user-slice";
import { VacationList } from "./vacation-list";
import { vacationService } from "../../../services/vacation-service";
const vacation = {
    id: 1,
    destination: "Rome",
    country: "Italy",
    continent: "Europe",
    description: "Explore Rome.",
    startDate: "2020-01-01",
    endDate: "2020-01-02",
    price: 0,
    imageName: "rome.jpg",
    imageUrl: "/api/vacations/images/rome.jpg",
    likesCount: 0,
    isLiked: false,
};
afterEach(() => {
    vi.restoreAllMocks();
    store.dispatch(userSlice.actions.signOut());
});

it("cancelled deletion leaves the record untouched; confirmation deletes and refreshes", async () => {
    store.dispatch(
        userSlice.actions.signIn({
            id: 7,
            firstName: "Test",
            lastName: "Admin",
            email: "admin@example.com",
            roleId: 1,
        }),
    );
    const getPage = vi.spyOn(vacationService, "getPage").mockResolvedValue({
        vacations: [vacation],
        total: 1,
        page: 1,
        pageSize: 9,
        totalPages: 1,
    });
    const remove = vi.spyOn(vacationService, "remove").mockResolvedValue();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
        <Provider store={store}>
            <MemoryRouter>
                <VacationList />
            </MemoryRouter>
        </Provider>,
    );
    const button = await screen.findByRole("button", { name: "Delete Rome" });
    await userEvent.click(button);
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Rome" })).toBeVisible();
    confirm.mockReturnValue(true);
    getPage.mockResolvedValue({ vacations: [], total: 0, page: 1, pageSize: 9, totalPages: 0 });
    await userEvent.click(button);
    await waitFor(() => expect(remove).toHaveBeenCalledWith(1));
    expect(await screen.findByText("No vacations here yet.")).toBeVisible();
});
