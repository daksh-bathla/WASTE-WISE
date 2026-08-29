import type { Category, Impact } from "@/schemas/analysis";

/**
 * Transparent, source-able coefficients — NOT LLM output.
 * co2e = kg of material diverted from landfill/incineration × factor (g CO2e / kg).
 * Factors are rough lifecycle/disposal-avoidance estimates for a demo; each is
 * documented so a judge can challenge it.
 */
const CO2E_PER_KG: Record<Category, number> = {
  food_scraps: 700, // avoided methane from landfilled food waste, composted instead
  expired_food: 700,
  packaging: 1800, // mixed plastic/card recycling vs virgin production
  electronics: 25000, // high embodied carbon; reuse/recycle vs new device share
  battery: 8000, // hazardous processing + material recovery
  chemical: 500, // safe treatment vs environmental release (conservative)
  textile: 15000, // cotton/polyester lifecycle is very carbon-intensive
  glass: 300,
  paper: 900,
  other: 1000,
};

const TYPICAL_KG: Record<Category, number> = {
  food_scraps: 0.2,
  expired_food: 0.3,
  packaging: 0.05,
  electronics: 0.3,
  battery: 0.02,
  chemical: 0.5,
  textile: 0.4,
  glass: 0.4,
  paper: 0.1,
  other: 0.2,
};

const PHONE_CHARGE_G = 8.22; // ~10.5 Wh × ~0.71 kg CO2e/kWh (India grid), grams
const TREE_YEAR_G = 21000; // ~21 kg CO2 sequestered per mature tree per year

export function estimateImpact(category: Category, kgOverride?: number): Impact {
  const kg = kgOverride ?? TYPICAL_KG[category] ?? 0.2;
  const co2e = Math.round(kg * (CO2E_PER_KG[category] ?? 1000));

  let equivalent: string;
  if (co2e >= TREE_YEAR_G / 4) {
    equivalent = `≈ ${(co2e / TREE_YEAR_G).toFixed(2)} tree-years of CO₂`;
  } else {
    equivalent = `≈ ${Math.max(1, Math.round(co2e / PHONE_CHARGE_G))} phone charges`;
  }

  return { kg_diverted: Math.round(kg * 1000) / 1000, co2e_grams_avoided: co2e, equivalent };
}
