import type { Component, Identification } from "@/schemas/analysis";

/**
 * Rules-first decomposition. No LLM call — the identification already
 * carries category + materials + condition, which is enough for a
 * hackathon-grade split. Each component is safety-gated independently.
 */
export function decompose(identification: Identification): Component[] {
  const { category, materials, condition, item } = identification;
  const mat = (fallback: string) => materials[0] ?? fallback;

  switch (category) {
    case "electronics":
      return [
        { name: "outer casing", material: mat("plastic/metal"), condition },
        { name: "battery", material: "lithium-ion", condition },
        { name: "circuit board", material: "mixed electronics", condition },
        { name: "cable / charger", material: "copper + plastic", condition },
      ];
    case "battery":
      return [{ name: "cell", material: mat("battery"), condition }];
    case "packaging":
      if (materials.length > 1) return materials.map((m) => ({ name: `${m} part`, material: m, condition }));
      return [{ name: "packaging", material: mat("mixed packaging"), condition }];
    case "food_scraps":
    case "expired_food":
      return [{ name: item || "organic scrap", material: mat("organic"), condition }];
    case "chemical":
      return [
        { name: "container", material: mat("plastic/metal"), condition },
        { name: "chemical residue", material: "chemical", condition: "contaminated" },
      ];
    case "textile":
      return [{ name: "fabric", material: mat("textile"), condition }];
    case "glass":
      return [{ name: "glass item", material: "glass", condition }];
    case "paper":
      return [{ name: "paper / card", material: "paper", condition }];
    default:
      if (materials.length > 1) return materials.map((m) => ({ name: `${m} part`, material: m, condition }));
      return [{ name: item || "item", material: mat("mixed"), condition }];
  }
}
