import { test } from "node:test";
import assert from "node:assert/strict";
import { vacationCreateSchema, vacationUpdateSchema } from "../src/models/vacation-model";

const vacation = {
    destination: "Rome", country: "Italy", continent: "Europe",
    description: "Explore the city.", price: "1290.50",
    startDate: "2026-10-06", endDate: "2026-10-06"
};

test("creation allows today and future dates but editing also allows the past", context => {
    context.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-06T12:00:00Z") });
    assert.equal(vacationCreateSchema.safeParse(vacation).success, true);
    const past = { ...vacation, startDate: "2026-10-05", endDate: "2026-10-05" };
    assert.equal(vacationCreateSchema.safeParse(past).success, false);
    assert.equal(vacationUpdateSchema.safeParse(past).success, true);
    assert.equal(vacationCreateSchema.safeParse({ ...vacation, startDate: "2026-10-07", endDate: "2026-10-08" }).success, true);
    // The cutoff must advance after midnight, rather than freeze at module load.
    context.mock.timers.setTime(new Date("2026-10-07T00:00:00Z").getTime());
    assert.equal(vacationCreateSchema.safeParse(vacation).success, false);
});

test("dates must exist, use date-only format, and end on or after the start", () => {
    for (const startDate of [undefined, "", "2026-02-30", "2026-02-29", "06/10/2026", "2026-10-06T12:00:00Z"]) {
        assert.equal(vacationUpdateSchema.safeParse({ ...vacation, startDate }).success, false);
    }
    assert.equal(vacationUpdateSchema.safeParse({ ...vacation, endDate: "" }).success, false);
    assert.equal(vacationUpdateSchema.safeParse({ ...vacation, endDate: "2026-10-05" }).success, false);
    assert.equal(vacationUpdateSchema.safeParse({ ...vacation, startDate: "2028-02-29", endDate: "2028-02-29" }).success, true);
});

test("price accepts both boundaries and numeric text but rejects missing or out-of-range values", () => {
    for (const price of [0, 10000, "0", "10000"]) {
        assert.equal(vacationUpdateSchema.safeParse({ ...vacation, price }).success, true);
    }
    for (const price of [undefined, null, "", "   ", -1, 10001, "not a price"]) {
        assert.equal(vacationUpdateSchema.safeParse({ ...vacation, price }).success, false);
    }
    assert.equal(vacationUpdateSchema.parse(vacation).price, 1290.5);
});
