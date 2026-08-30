import rates from "@/data/scrap-rates.json";
import type { Category, Identification, ResaleValue } from "@/schemas/analysis";

type MaterialRate = { match: string[]; label: string; low: number; high: number };
const MATERIALS = rates.materials as MaterialRate[];
const CHANNELS = rates.channels as Record<string, { label: string; url: string }>;

/** Categories where "what's it worth" is meaningless or the wrong message. */
const NO_VALUE: Category[] = ["food_scraps", "expired_food", "chemical"];

/**
 * Rough mass of one household batch of this material at scrap time — a stack of
 * newspaper, one carton, one garment. Deliberately larger than the CO2 model's
 * per-item weights: you sell a bag, not a bottle.
 */
const BATCH_KG: Partial<Record<Category, number>> = {
  paper: 1.5,
  packaging: 0.4,
  glass: 0.4,
  textile: 0.3,
  other: 0.3,
};
const DEFAULT_BATCH_KG = 0.3;

const haystack = (id: Identification) =>
  [id.item, id.category, ...id.materials].join(" ").toLowerCase();

function matchRate(text: string): MaterialRate | null {
  // Score each material by its longest keyword that appears in the text, so
  // "cardboard box" matches Cardboard (9-char hit) not Mixed paper (5-char "paper").
  // Rate is only the tie-breaker.
  const scored = MATERIALS.map((m) => {
    const longest = m.match.filter((k) => text.includes(k)).sort((a, b) => b.length - a.length)[0];
    return longest ? { m, len: longest.length } : null;
  }).filter((x): x is { m: MaterialRate; len: number } => x !== null);

  if (!scored.length) return null;
  scored.sort((a, b) => b.len - a.len || b.m.high - a.m.high);
  return scored[0].m;
}

/**
 * Deterministic resale/scrap value. Runs with or without an API key. Returns
 * null when the item has no meaningful resale value or when selling it is the
 * wrong thing to encourage (hazards handled by the caller via disposalOnly).
 */
export function estimateResale(id: Identification, kgOverride?: number): ResaleValue | null {
  if (NO_VALUE.includes(id.category)) return null;
  // Never put a price tag on something hazardous, rotting, or expired — the
  // message for those is safe disposal, not "a kabadiwala will pay you for it".
  if (id.hazards.length > 0) return null;
  if (["mouldy", "contaminated", "expired"].includes(id.condition)) return null;

  const text = haystack(id);

  // Electronics: worth real money if they still work, but model-dependent — route
  // to a quote, not a fixed number. A visibly damaged device has little resale
  // value; the dispose action already routes it to e-waste recycling.
  const looksElectronic = id.category === "electronics" || /phone|laptop|tablet|camera|console|smartwatch/.test(text);
  if (looksElectronic) {
    if (id.condition === "damaged") return null;
    const c = CHANNELS.cashify;
    return {
      basis: "Working electronics have real resale value, but it depends on the exact model and condition.",
      channel: "cashify",
      channel_label: c.label,
      channel_url: c.url,
    };
  }

  // Batteries: scrap value exists but the safe message is disposal, not resale.
  if (id.category === "battery") return null;

  const rate = matchRate(text);
  if (!rate) return null;

  const kg = kgOverride ?? BATCH_KG[id.category] ?? DEFAULT_BATCH_KG;
  const low = Math.round(rate.low * kg);
  const high = Math.round(rate.high * kg);

  // A ₹1–2 "estimate" is noise; only surface it once it clears a few rupees.
  if (high < 4) return null;

  const c = CHANNELS.kabadiwala;
  return {
    inr_low: low,
    inr_high: high,
    basis: `About ${rate.label.toLowerCase()} at ${rates.region} kabadiwala rates (₹${rate.low}–${rate.high}/kg, ${rates.as_of}). Small amounts round to a few rupees; a full bag is where it adds up.`,
    channel: "kabadiwala",
    channel_label: c.label,
    channel_url: c.url,
  };
}

export const RESALE_DISCLAIMER = rates.disclaimer;
