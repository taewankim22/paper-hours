import { describe, expect, it } from "vitest";
import { advanceBend, bendPoint, PAPER_WIDTH, uvToPage } from "./paperMath";

describe("paper geometry and interaction", () => {
  it("pins the whole spine throughout the curl", () => {
    for (const angle of [0, 0.3, 1.2, 2.55]) for (const y of [-3.1, 0, 3.1])
      expect(bendPoint(0, y, angle)).toEqual([0, y, 0]);
  });
  it("preserves sheet length along each horizontal row", () => {
    for (const angle of [0, 0.6, 1.8, 2.55]) {
      let length = 0;
      let previous = bendPoint(0, 1, angle);
      for (let i = 1; i <= 100; i++) {
        const p = bendPoint(PAPER_WIDTH * i / 100, 1, angle);
        length += Math.hypot(p[0] - previous[0], p[2] - previous[2]);
        previous = p;
      }
      expect(length).toBeCloseTo(PAPER_WIDTH, 3);
    }
  });
  it("maps texture corners into DOM coordinates without a vertical inversion", () => {
    expect(uvToPage(0, 1)).toEqual({ x: 0, y: 0 });
    expect(uvToPage(1, 0)).toEqual({ x: 460, y: 620 });
    expect(uvToPage(0.5, 0.5)).toEqual({ x: 230, y: 310 });
  });
  it("settles after release and stays finite after long frame gaps", () => {
    let state = { value: 2.5, velocity: 0 };
    for (let i = 0; i < 180; i++) state = advanceBend(state.value, state.velocity, 0, 1 / 60);
    expect(state.value).toBeCloseTo(0, 5);
    expect(Number.isFinite(advanceBend(2, 100, 0, 300).value)).toBe(true);
  });
});
