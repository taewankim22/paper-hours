import { describe, expect, it } from "vitest";
import {
  daysUntil,
  moveBlock,
  shiftDate,
  totalHours,
  timeLabel,
  type Block,
} from "./store";
const block: Block = {
  id: "test",
  start: 8,
  duration: 2,
  subject: "Mathematics",
};
describe("planner date and time boundaries", () => {
  it("moves dates across month and year boundaries", () => {
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("supports leap days", () =>
    expect(shiftDate("2028-02-28", 1)).toBe("2028-02-29"));
  it("computes signed countdowns without local DST offsets", () => {
    expect(daysUntil("2026-10-09", "2026-12-03")).toBe(55);
    expect(daysUntil("2026-12-04", "2026-12-03")).toBe(-1);
  });
  it("clamps dragged blocks to the full timetable", () => {
    expect(moveBlock(block, 4).start).toBe(6);
    expect(moveBlock(block, 23.5).start).toBe(22);
  });
  it("snaps moves to half-hour boundaries and retains duration", () =>
    expect(moveBlock(block, 10.3)).toEqual({ ...block, start: 10.5 }));
  it("does not double count overlapping study blocks", () =>
    expect(
      totalHours([block, { ...block, id: "overlap", start: 9, duration: 2 }]),
    ).toBe(3));
  it("sums separate periods and handles empty days", () => {
    expect(totalHours([])).toBe(0);
    expect(
      totalHours([block, { ...block, id: "next", start: 12, duration: 0.5 }]),
    ).toBe(2.5);
  });
  it("formats half hours and midnight", () => {
    expect(timeLabel(6)).toBe("06:00");
    expect(timeLabel(23.5)).toBe("23:30");
    expect(timeLabel(24)).toBe("24:00");
  });
});
