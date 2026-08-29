import { describe, it, expect } from "vitest";
import { estimateImpact } from "./coefficients";
import type { Category } from "@/schemas/analysis";

describe("estimateImpact", () => {
  it("uses the per-category typical mass when no override is given", () => {
    const r = estimateImpact("battery");
    expect(r.kg_diverted).toBe(0.02);
    expect(r.co2e_grams_avoided).toBe(160); // 0.02kg x 8000 g/kg
  });

  it("honours an explicit mass override", () => {
    const r = estimateImpact("battery", 1);
    expect(r.kg_diverted).toBe(1);
    expect(r.co2e_grams_avoided).toBe(8000);
  });

  it("scales linearly with mass", () => {
    const one = estimateImpact("paper", 1).co2e_grams_avoided;
    const ten = estimateImpact("paper", 10).co2e_grams_avoided;
    expect(ten).toBe(one * 10);
  });

  it("reports small savings in phone charges", () => {
    expect(estimateImpact("glass", 0.1).equivalent).toMatch(/phone charges$/);
  });

  it("switches to tree-years once the saving is large", () => {
    expect(estimateImpact("electronics", 5).equivalent).toMatch(/tree-years/);
  });

  it("never reports zero phone charges for a tiny but non-zero saving", () => {
    const r = estimateImpact("glass", 0.0001);
    expect(r.equivalent).toBe("≈ 1 phone charges");
  });

  it("produces a finite, non-negative result for every category", () => {
    const categories: Category[] = [
      "food_scraps", "expired_food", "packaging", "electronics", "battery",
      "chemical", "textile", "glass", "paper", "other",
    ];
    for (const c of categories) {
      const r = estimateImpact(c);
      expect(r.co2e_grams_avoided).toBeGreaterThan(0);
      expect(Number.isFinite(r.co2e_grams_avoided)).toBe(true);
      expect(r.kg_diverted).toBeGreaterThan(0);
      expect(r.equivalent).toBeTruthy();
    }
  });

  it("handles a zero-mass item without dividing by zero", () => {
    const r = estimateImpact("paper", 0);
    expect(r.kg_diverted).toBe(0);
    expect(r.co2e_grams_avoided).toBe(0);
    expect(r.equivalent).toBe("≈ 1 phone charges");
  });

  it("rounds mass to three decimals", () => {
    expect(estimateImpact("paper", 0.123456).kg_diverted).toBe(0.123);
  });
});
