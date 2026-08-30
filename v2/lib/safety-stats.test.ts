import { describe, it, expect } from "vitest";
import { getSafetyStats } from "./safety-stats";

describe("getSafetyStats — the /safety page data", () => {
  it("covers all 20 cases and flags exactly 10 traps", async () => {
    const s = await getSafetyStats();
    expect(s.total).toBe(20);
    expect(s.rows).toHaveLength(20);
    expect(s.rows.filter((r) => r.trap)).toHaveLength(10);
    expect(s.traps).toBe(10);
  });

  it("lists trap cases before normal cases", async () => {
    const { rows } = await getSafetyStats();
    const firstNormal = rows.findIndex((r) => !r.trap);
    const lastTrap = rows.map((r) => r.trap).lastIndexOf(true);
    expect(lastTrap).toBeLessThan(firstNormal);
  });

  it("reports zero leaks and all traps passing on the shipped rulebook", async () => {
    const s = await getSafetyStats();
    expect(s.leaks).toBe(0);
    expect(s.allTrapsPass).toBe(true);
    expect(s.trapsPassed).toBe(s.traps);
  });

  it("carries the headline triple used by the landing page", async () => {
    const { headline } = await getSafetyStats();
    expect(headline).toEqual({ cases: 20, traps: 10, leaks: 0 });
  });

  it("every trap row names the actions it must block", async () => {
    const { rows } = await getSafetyStats();
    for (const r of rows.filter((row) => row.trap)) {
      expect(r.expectedBlockedActions.length).toBeGreaterThan(0);
    }
  });
});
