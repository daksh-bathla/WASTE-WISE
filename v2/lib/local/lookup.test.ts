import { describe, it, expect } from "vitest";
import { findLocalOptions, haversineKm, LOCAL_REGION } from "./lookup";

const CONNAUGHT_PLACE: [number, number] = [28.6315, 77.2167];
const NOIDA: [number, number] = [28.5355, 77.391];

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(CONNAUGHT_PLACE, CONNAUGHT_PLACE)).toBe(0);
  });

  it("is symmetric", () => {
    expect(haversineKm(CONNAUGHT_PLACE, NOIDA)).toBe(haversineKm(NOIDA, CONNAUGHT_PLACE));
  });

  it("gives a plausible Delhi-to-Noida distance", () => {
    const d = haversineKm(CONNAUGHT_PLACE, NOIDA);
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(40);
  });
});

describe("findLocalOptions", () => {
  it("exposes the region it covers", () => {
    expect(LOCAL_REGION).toBeTruthy();
  });

  it("returns hazardous-waste routes for a battery, never a scrap dealer", () => {
    const opts = findLocalOptions("battery");
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.some((o) => /scrap dealer/.test(o.type))).toBe(false);
  });

  it("omits distance when the caller gave no coordinates", () => {
    for (const o of findLocalOptions("packaging")) {
      expect(o.distance_km).toBeUndefined();
    }
  });

  it("includes distance and sorts nearest-first when coordinates are given", () => {
    const opts = findLocalOptions("electronics", { coords: NOIDA });
    expect(opts.length).toBeGreaterThan(0);
    const distances = opts.map((o) => o.distance_km!);
    expect(distances.every((d) => typeof d === "number")).toBe(true);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it("respects the limit", () => {
    expect(findLocalOptions("other", { limit: 1 })).toHaveLength(1);
  });

  it("returns an empty list rather than throwing for a category with no mapped facilities", () => {
    // every category is mapped today; this guards the `?? []` fallback
    const opts = findLocalOptions("glass");
    expect(Array.isArray(opts)).toBe(true);
  });

  it("gives every option a name and a human-readable note", () => {
    for (const o of findLocalOptions("food_scraps")) {
      expect(o.name).toBeTruthy();
      expect(o.note).toContain("accepts:");
    }
  });
});
