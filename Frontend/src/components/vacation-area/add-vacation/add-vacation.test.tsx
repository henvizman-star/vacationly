import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AddVacation } from "./add-vacation";
import { vacationService } from "../../../services/vacation-service";
import type { VacationModel } from "../../../models/vacation-model";

afterEach(() => vi.restoreAllMocks());

// A destination route exposes navigation state without starting the API or MySQL.
function Result() {
    const location = useLocation();
    return <p>Created: {location.state?.createdDestination}</p>;
}

async function fillForm(destination = "Paris") {
    render(
        <MemoryRouter initialEntries={["/vacations/new"]}>
            <Routes>
                <Route path="/vacations/new" element={<AddVacation />} />
                <Route path="/vacations" element={<Result />} />
            </Routes>
        </MemoryRouter>,
    );
    const today = new Date().toISOString().slice(0, 10);
    for (const [label, value] of [
        ["Destination", destination],
        ["Country", "France"],
        ["Continent", "Europe"],
        ["Description", "Walk beside the Seine."],
        ["Start date", today],
        ["End date", today],
        ["Price (USD)", "0"],
    ]) {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    const image = new File(["image bytes"], "paris.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Vacation image"), image);
    return { today, image };
}

// jsdom's native required-file check does not recognize userEvent's FileList.
// Submit directly to exercise application validation and the async upload flow.
function submitForm() {
    fireEvent.submit(screen.getByRole("button", { name: "Add vacation" }).closest("form")!);
}

it("submits a zero-price, same-day vacation with its image and navigates after success", async () => {
    const add = vi
        .spyOn(vacationService, "add")
        .mockResolvedValue({ destination: "Paris" } as VacationModel);
    const { today, image } = await fillForm();
    submitForm();
    expect(await screen.findByText("Created: Paris")).toBeVisible();
    expect(add).toHaveBeenCalledWith(
        {
            destination: "Paris",
            country: "France",
            continent: "Europe",
            description: "Walk beside the Seine.",
            startDate: today,
            endDate: today,
            price: 0,
        },
        image,
    );
});

it("blocks whitespace-only text before sending an upload", async () => {
    const add = vi.spyOn(vacationService, "add");
    await fillForm("   ");
    submitForm();
    expect(await screen.findByRole("alert")).toHaveTextContent("Complete all vacation details.");
    expect(add).not.toHaveBeenCalled();
});

it("blocks repeated submission while saving and preserves input after an API failure", async () => {
    let rejectUpload!: (error: Error) => void;
    const add = vi.spyOn(vacationService, "add").mockImplementation(
        () =>
            new Promise((_resolve, reject) => {
                rejectUpload = reject;
            }),
    );
    await fillForm();
    submitForm();
    await waitFor(() =>
        expect(screen.getByRole("button", { name: "Saving vacation…" })).toBeDisabled(),
    );
    expect(screen.getByLabelText("Destination")).toBeDisabled();
    rejectUpload(new Error("Upload failed."));
    expect(await screen.findByRole("alert")).toHaveTextContent("Upload failed.");
    expect(screen.getByLabelText("Destination")).toHaveValue("Paris");
    expect(screen.getByRole("button", { name: "Add vacation" })).toBeEnabled();
    expect(add).toHaveBeenCalledTimes(1);
});
