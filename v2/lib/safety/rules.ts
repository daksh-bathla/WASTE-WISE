import type { Component, Identification, Surface } from "@/schemas/analysis";

/**
 * Deterministic safety rules. These are the product's spine: the LLM may
 * explain a verdict but can never overturn one. Every rule is unit-tested
 * and referenced by the eval trap cases.
 *
 * A rule inspects the identification + one component and, if it fires,
 * contributes blocked surfaces / blocked phrasings. Blocks are unioned
 * across all matching rules; the default posture is permissive ONLY for
 * surfaces no rule blocked.
 */

export type RuleContribution = {
  blockSurfaces?: Surface[];
  blockActions?: string[];
  disposalOnly?: boolean;
  reason: string;
};

export type SafetyRule = {
  id: string;
  description: string;
  test: (ctx: RuleContext) => RuleContribution | null;
};

export type RuleContext = {
  identification: Identification;
  component: Component;
  /** lowercased haystack of item + component + materials + hazards + condition + signals */
  text: string;
};

const has = (text: string, ...needles: string[]) => needles.some((n) => text.includes(n));

export const SAFETY_RULES: SafetyRule[] = [
  {
    id: "lithium-battery",
    description: "Lithium / rechargeable cells: fire + toxic risk if damaged.",
    test: ({ identification, text }) => {
      const isBattery =
        identification.category === "battery" ||
        has(text, "lithium", "li-ion", "li-po", "lipo", "18650", "power bank", "coin cell", "button cell");
      if (!isBattery) return null;
      return {
        blockSurfaces: ["body", "food", "animal", "plant", "craft"],
        blockActions: [
          "puncture",
          "pierce",
          "cut open",
          "burn",
          "incinerate",
          "compost",
          "bury",
          "throw in household bin",
          "store loose with metal",
        ],
        disposalOnly: true,
        reason: "Lithium cells can ignite or leak toxic electrolyte if punctured, heated, or crushed.",
      };
    },
  },
  {
    id: "dry-cell-battery",
    description: "Alkaline / zinc-carbon batteries: still hazardous waste.",
    test: ({ identification, text }) => {
      const isDry =
        (identification.category === "battery" || has(text, "aa battery", "aaa battery", "alkaline", "zinc")) &&
        !has(text, "lithium", "li-ion");
      if (!isDry) return null;
      return {
        blockSurfaces: ["body", "food", "animal", "plant"],
        blockActions: ["compost", "throw in household bin", "cut open", "burn"],
        disposalOnly: true,
        reason: "Batteries leak heavy metals; they must go to a battery collection point, not the bin or compost.",
      };
    },
  },
  {
    id: "mould-rot",
    description: "Visible mould / rot: mycotoxins unsafe on skin, ingested, or as feed.",
    test: ({ component, identification, text }) => {
      const mouldy =
        component.condition === "mouldy" ||
        component.condition === "contaminated" ||
        identification.condition === "mouldy" ||
        has(text, "mould", "mold", "mouldy", "rotten", "rot ", "fungus", "slimy", "fermented smell");
      if (!mouldy) return null;
      return {
        blockSurfaces: ["body", "food", "animal", "craft"],
        blockActions: [
          "face pack",
          "face mask",
          "skin scrub",
          "hair mask",
          "animal feed",
          "cattle feed",
          "chicken feed",
          "eat",
          "consume",
        ],
        reason: "Mould produces mycotoxins that are not destroyed by washing and are unsafe on skin, ingested, or fed to animals.",
      };
    },
  },
  {
    id: "expired-medicine",
    description: "Medicines / supplements: never compost, flush, or reuse.",
    test: ({ text }) => {
      const isMed = has(
        text,
        "medicine",
        "medication",
        "tablet",
        "capsule",
        "pill",
        "syrup",
        "ointment",
        "antibiotic",
        "blister pack",
        "pharma",
        "drug",
        "inhaler",
      );
      if (!isMed) return null;
      return {
        blockSurfaces: ["body", "food", "animal", "plant", "craft"],
        blockActions: ["compost", "flush", "pour down drain", "reuse", "repurpose", "take", "consume"],
        disposalOnly: true,
        reason: "Expired medicines lose efficacy, can become toxic, and contaminate water if flushed or composted. Return to a pharmacy take-back or seal and bin per local rules.",
      };
    },
  },
  {
    id: "unknown-chemical",
    description: "Household chemicals / solvents / pesticides: disposal guidance only.",
    test: ({ identification, text }) => {
      const isChem =
        identification.category === "chemical" ||
        has(
          text,
          "bleach",
          "drain cleaner",
          "acid",
          "solvent",
          "thinner",
          "pesticide",
          "insecticide",
          "paint",
          "varnish",
          "corrosive",
          "ammonia",
          "phenyl",
          "kerosene",
        );
      if (!isChem) return null;
      const wetPaint = has(text, "paint", "varnish") && !has(text, "empty", "dried", "cured");
      return {
        blockSurfaces: ["body", "food", "animal", "plant", "craft"],
        blockActions: [
          "reuse the container",
          "store food in it",
          "pour down drain",
          "pour on soil",
          "mix with other products",
          ...(wetPaint ? ["wash brush in sink"] : []),
        ],
        disposalOnly: true,
        reason: "Chemical residue makes containers unsafe to reuse and harms drains, soil, and water. Take to a household hazardous waste facility.",
      };
    },
  },
  {
    id: "pet-toxic-food",
    description: "Foods toxic to common pets/livestock: block animal feed.",
    test: ({ text }) => {
      if (!has(text, "avocado", "onion", "garlic", "chocolate", "cocoa", "grape", "raisin", "caffeine", "coffee ground", "xylitol", "macadamia"))
        return null;
      return {
        blockSurfaces: ["animal"],
        blockActions: ["animal feed", "cattle feed", "dog treat", "cat treat", "chicken feed", "feed to pets", "feed to livestock"],
        reason: "This food is toxic to dogs, cats, and/or common livestock even in small amounts.",
      };
    },
  },
  {
    id: "sharp-object",
    description: "Blades / broken glass / needles: no bare-hand craft reuse.",
    test: ({ text }) => {
      if (!has(text, "blade", "razor", "knife", "broken glass", "shard", "needle", "syringe", "scalpel", "rusty", "rust"))
        return null;
      const biohazard = has(text, "needle", "syringe", "scalpel", "lancet");
      return {
        blockSurfaces: biohazard ? ["body", "food", "animal", "plant", "craft"] : ["body", "food"],
        blockActions: [
          "handle without gloves",
          "bare-hand craft",
          "give to children",
          ...(biohazard ? ["reuse", "recycle loose", "throw in household bin"] : []),
        ],
        disposalOnly: biohazard,
        reason: biohazard
          ? "Used sharps are a biohazard: seal in a puncture-proof container and use a sharps disposal point."
          : "Sharp or rusted edges cause cuts and infection risk; wrap before disposal, do not reuse in food or skin contact.",
      };
    },
  },
  {
    id: "mercury-lamp",
    description: "CFL / fluorescent tubes: contain mercury vapour.",
    test: ({ text }) => {
      if (!has(text, "cfl", "fluorescent", "tube light", "tubelight", "compact fluorescent", "mercury lamp")) return null;
      return {
        blockSurfaces: ["body", "food", "animal", "plant", "craft"],
        blockActions: ["crush", "break", "throw in household bin", "vacuum if broken", "reuse the glass"],
        disposalOnly: true,
        reason: "Fluorescent lamps contain mercury; breaking one releases toxic vapour. Take intact to an e-waste / lamp collection point.",
      };
    },
  },
  {
    id: "pressurised-container",
    description: "Aerosols / gas cylinders: explosion risk.",
    test: ({ text }) => {
      if (!has(text, "aerosol", "spray can", "deodorant can", "pressuris", "pressuriz", "gas cylinder", "lpg", "butane", "propane")) return null;
      return {
        blockSurfaces: ["body", "food", "animal", "plant", "craft"],
        blockActions: ["puncture", "crush", "incinerate", "burn", "heat", "cut open"],
        disposalOnly: true,
        reason: "Pressurised containers explode when punctured or heated. Empty fully at low pressure, then dispose via metal / hazardous waste routes.",
      };
    },
  },
  {
    id: "expired-cosmetic-skin",
    description: "Expired cosmetics: no fresh skin application.",
    test: ({ identification, text }) => {
      const isCosmetic = has(text, "cosmetic", "cream", "lotion", "serum", "sunscreen", "makeup", "mascara", "foundation", "lipstick");
      const expired = identification.condition === "expired" || has(text, "expired", "past date", "smells off", "separated");
      if (!isCosmetic || !expired) return null;
      return {
        blockSurfaces: ["body"],
        blockActions: ["apply to face", "apply to skin", "use on eyes", "use as moisturiser"],
        reason: "Expired cosmetics grow bacteria and oxidise; applying them risks irritation and infection, especially near the eyes.",
      };
    },
  },
];
