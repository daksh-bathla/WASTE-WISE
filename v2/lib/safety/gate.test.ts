import { describe, it, expect } from "vitest";
import type { Component, Identification } from "@/schemas/analysis";
import { evaluateComponent } from "./gate";

const id = (over: Partial<Identification>): Identification => ({
  category: "other",
  item: "thing",
  materials: [],
  condition: "unknown",
  expiry_signals: [],
  hazards: [],
  confidence: 0.9,
  ...over,
});

const comp = (over: Partial<Component>): Component => ({
  name: "body",
  material: "mixed",
  condition: "unknown",
  ...over,
});

describe("safety gate — trap cases", () => {
  it("lithium battery is disposal-only and blocks puncture/burn/compost", () => {
    const v = evaluateComponent(id({ category: "battery", item: "18650 lithium cell", hazards: ["lithium"] }), comp({ name: "cell", material: "lithium" }));
    expect(v.disposal_only).toBe(true);
    expect(v.allowed).toEqual([]);
    expect(v.blocked_actions).toEqual(expect.arrayContaining(["puncture", "burn", "compost"]));
  });

  it("mouldy bread blocks skin, feed and ingestion", () => {
    const v = evaluateComponent(id({ category: "expired_food", item: "mouldy bread", condition: "mouldy" }), comp({ name: "bread", material: "wheat", condition: "mouldy" }));
    expect(v.blocked).toEqual(expect.arrayContaining(["body", "food", "animal"]));
    expect(v.blocked_actions).toEqual(expect.arrayContaining(["face mask", "animal feed"]));
  });

  it("expired medicine is disposal-only, no compost/flush/reuse", () => {
    const v = evaluateComponent(id({ item: "expired paracetamol blister pack", condition: "expired" }), comp({ name: "tablets", material: "pharma" }));
    expect(v.disposal_only).toBe(true);
    expect(v.blocked_actions).toEqual(expect.arrayContaining(["compost", "flush", "reuse"]));
  });

  it("avocado blocks animal feed but allows compost (plant)", () => {
    const v = evaluateComponent(id({ category: "food_scraps", item: "avocado skin and pit" }), comp({ name: "peel", material: "organic" }));
    expect(v.blocked).toContain("animal");
    expect(v.allowed).toContain("plant");
  });

  it("bleach bottle residue is disposal-only, no container reuse", () => {
    const v = evaluateComponent(id({ category: "chemical", item: "empty bleach bottle", hazards: ["corrosive"] }), comp({ name: "bottle", material: "HDPE" }));
    expect(v.disposal_only).toBe(true);
    expect(v.blocked_actions).toEqual(expect.arrayContaining(["store food in it", "pour down drain"]));
  });

  it("CFL tube blocks crushing and household bin", () => {
    const v = evaluateComponent(id({ item: "broken CFL bulb", hazards: ["mercury"] }), comp({ name: "glass", material: "glass" }));
    expect(v.disposal_only).toBe(true);
    expect(v.blocked_actions).toEqual(expect.arrayContaining(["crush", "throw in household bin"]));
  });

  it("aerosol can blocks puncture and incineration", () => {
    const v = evaluateComponent(id({ item: "aerosol deodorant can" }), comp({ name: "can", material: "aluminium" }));
    expect(v.blocked_actions).toEqual(expect.arrayContaining(["puncture", "incinerate"]));
  });
});

describe("safety gate — normal items stay permissive", () => {
  it("clean banana peel allows plant and animal surfaces", () => {
    const v = evaluateComponent(id({ category: "food_scraps", item: "fresh banana peel", condition: "good" }), comp({ name: "peel", material: "organic", condition: "good" }));
    expect(v.disposal_only).toBe(false);
    expect(v.allowed).toEqual(expect.arrayContaining(["plant", "animal"]));
  });

  it("clean glass jar allows craft reuse", () => {
    const v = evaluateComponent(id({ category: "glass", item: "empty glass jam jar", condition: "good" }), comp({ name: "jar", material: "glass", condition: "good" }));
    expect(v.allowed).toContain("craft");
    expect(v.disposal_only).toBe(false);
  });
});
