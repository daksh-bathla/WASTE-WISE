import { describe, it, expect } from "vitest";
import { estimateResale } from "./estimate";
import type { Identification } from "@/schemas/analysis";

const id = (o: Partial<Identification>): Identification => ({
  category: "other",
  item: "item",
  materials: [],
  condition: "good",
  expiry_signals: [],
  hazards: [],
  confidence: 0.9,
  ...o,
});

describe("estimateResale", () => {
  it("prices a newspaper stack in rupees with a kabadiwala link", () => {
    const r = estimateResale(id({ category: "paper", item: "stack of newspapers", materials: ["paper"] }));
    expect(r?.inr_low).toBeGreaterThan(0);
    expect(r!.inr_high).toBeGreaterThanOrEqual(r!.inr_low!);
    expect(r?.channel).toBe("kabadiwala");
    expect(r?.channel_url).toMatch(/^https:\/\//);
  });

  it("routes electronics to a resale quote, not a fixed price", () => {
    const r = estimateResale(id({ category: "electronics", item: "old smartphone" }));
    expect(r?.inr_low).toBeUndefined();
    expect(r?.channel).toBe("cashify");
    expect(r?.basis).toMatch(/model|condition/i);
  });

  it("returns null for food scraps, chemicals and expired food", () => {
    expect(estimateResale(id({ category: "food_scraps", item: "banana peel" }))).toBeNull();
    expect(estimateResale(id({ category: "expired_food", item: "mouldy bread" }))).toBeNull();
    expect(estimateResale(id({ category: "chemical", item: "bleach bottle" }))).toBeNull();
  });

  it("returns null for batteries — the message there is disposal, not resale", () => {
    expect(estimateResale(id({ category: "battery", item: "18650 cell", materials: ["lithium"] }))).toBeNull();
  });

  it("suppresses estimates that round to a rupee or two", () => {
    // one t-shirt of cloth at ~₹5-10/kg is below the noise floor
    expect(estimateResale(id({ category: "textile", item: "cotton t-shirt", materials: ["cotton"] }))).toBeNull();
  });

  it("picks the most specific material match, not the priciest", () => {
    // "cardboard box" must read as cardboard, not "mixed paper / books"
    const r = estimateResale(id({ category: "paper", item: "cardboard box", materials: ["cardboard"] }));
    expect(r?.basis).toMatch(/cardboard/i);
  });

  it("routes a damaged device to disposal, not a resale quote", () => {
    expect(
      estimateResale(id({ category: "electronics", item: "broken charger", condition: "damaged" })),
    ).toBeNull();
  });

  it("gives nothing a price tag when a hazard was flagged", () => {
    const r = estimateResale(id({ category: "packaging", item: "aerosol can", materials: ["aluminium"], hazards: ["pressurised"] }));
    expect(r).toBeNull();
  });

  it("never returns a negative or inverted range", () => {
    for (const cat of ["paper", "packaging", "glass", "textile", "other"] as const) {
      const r = estimateResale(id({ category: cat, item: `${cat} thing`, materials: [cat] }));
      if (r?.inr_low != null) {
        expect(r.inr_low).toBeGreaterThanOrEqual(0);
        expect(r.inr_high).toBeGreaterThanOrEqual(r.inr_low);
      }
    }
  });
});
