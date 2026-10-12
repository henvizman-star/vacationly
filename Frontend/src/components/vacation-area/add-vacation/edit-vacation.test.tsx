import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AddVacation } from "./add-vacation";
import { vacationService } from "../../../services/vacation-service";
const vacation = { id: 1, destination: "Rome", country: "Italy", continent: "Europe", description: "Explore Rome.",
    startDate: "2020-01-01", endDate: "2020-01-02", price: 0, imageName: "rome.jpg",
    imageUrl: "/api/vacations/images/rome.jpg", likesCount: 0, isLiked: false };
afterEach(() => vi.restoreAllMocks());

it("loads past dates and saves edits without requiring a replacement image", async () => {
    vi.spyOn(vacationService, "getOne").mockResolvedValue(vacation);
    const update = vi.spyOn(vacationService, "update").mockResolvedValue(vacation);
    render(<MemoryRouter initialEntries={["/vacations/1/edit"]}><Routes>
        <Route path="/vacations/:id/edit" element={<AddVacation editing />} />
        <Route path="/vacations" element={<p>Updated vacation</p>} />
    </Routes></MemoryRouter>);
    await screen.findByRole("heading", { name: "Edit vacation" });
    expect(screen.getByLabelText("Destination")).toHaveValue("Rome");
    expect(screen.getByLabelText("Start date")).toHaveValue("2020-01-01");
    expect(screen.getByLabelText("Start date")).not.toHaveAttribute("min");
    expect(screen.getByLabelText("Vacation image")).not.toBeRequired();
    expect(screen.getByAltText("Current vacation")).toHaveAttribute("src", vacation.imageUrl);
    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);
    await screen.findByText("Updated vacation");
    await waitFor(() => expect(update).toHaveBeenCalledWith(1, expect.objectContaining({ price: 0, startDate: "2020-01-01" }), undefined));
});
