import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VacationCard } from "./vacation-card";
import type { VacationModel } from "../../../models/vacation-model";
const vacation: VacationModel = {
    id: 1,
    destination: "Paris",
    country: "France",
    continent: "Europe",
    description: "Walk beside the Seine.",
    startDate: "2026-09-15",
    endDate: "2026-09-20",
    price: 1590,
    imageName: "paris.jpg",
    imageUrl: "/api/vacations/images/paris.jpg",
    likesCount: 2,
    isLiked: false,
};
describe("VacationCard", () => {
    it("shows destination, full description, date, price and a personal Like state", async () => {
        const onLike = vi.fn();
        render(<VacationCard vacation={vacation} isAdmin={false} busy={false} onLike={onLike} />);
        expect(screen.getByText("Walk beside the Seine.")).toBeVisible();
        expect(screen.getByText("$1,590")).toBeVisible();
        expect(screen.getByText("Sep 15, 2026")).toBeVisible();
        const button = screen.getByRole("button", { name: "Like Paris" });
        expect(button).toHaveAttribute("aria-pressed", "false");
        await userEvent.click(button);
        expect(onLike).toHaveBeenCalledWith(vacation);
    });
    it("does not offer Like controls to an administrator", () => {
        render(<VacationCard vacation={vacation} isAdmin busy={false} onLike={vi.fn()} />);
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(screen.getByText("2 travelers like this")).toBeVisible();
    });
    it("shows an existing Like and blocks repeat actions while saving", () => {
        render(
            <VacationCard
                vacation={{ ...vacation, isLiked: true }}
                isAdmin={false}
                busy
                onLike={vi.fn()}
            />,
        );
        expect(screen.getByRole("button", { name: "Unlike Paris" })).toBeDisabled();
        expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    });
});
