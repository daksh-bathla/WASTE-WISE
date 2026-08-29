import { z } from "zod";

/**
 * Shared contracts for the WasteWise analysis pipeline.
 * The LLM is forced to emit `IdentificationSchema`; everything downstream
 * (decompose, safety gate, ranking) is validated against these types too.
 */

export const CATEGORIES = [
  "food_scraps",
  "expired_food",
  "packaging",
  "electronics",
  "battery",
  "chemical",
  "textile",
  "glass",
  "paper",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SURFACES = ["body", "food", "animal", "plant", "craft", "none"] as const;
export type Surface = (typeof SURFACES)[number];

export const ACTION_KINDS = ["reuse", "pass_on", "dispose"] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

export const CONDITIONS = ["good", "worn", "damaged", "expired", "mouldy", "contaminated", "unknown"] as const;

/** Stage 1 — what the vision model returns. */
export const IdentificationSchema = z.object({
  category: z.enum(CATEGORIES),
  item: z.string().min(1).describe("Short plain name, e.g. 'banana peel', 'AA alkaline battery'"),
  brand: z.string().optional(),
  materials: z.array(z.string()).default([]).describe("Physical materials present"),
  condition: z.enum(CONDITIONS),
  expiry_signals: z.array(z.string()).default([]).describe("Visible cues: mould, rust, leak, swelling, printed date"),
  hazards: z.array(z.string()).default([]).describe("Lithium, corrosive, sharp, pressurised, biohazard, etc."),
  confidence: z.number().min(0).max(1),
  clarifying_question: z
    .string()
    .optional()
    .describe("If confidence is low, ONE question that would resolve it. Otherwise omit."),
});
export type Identification = z.infer<typeof IdentificationSchema>;

/** Stage 2 — physical components an item breaks into. */
export const ComponentSchema = z.object({
  name: z.string(),
  material: z.string(),
  condition: z.enum(CONDITIONS),
});
export type Component = z.infer<typeof ComponentSchema>;

/** Stage 3 — deterministic safety verdict for one component. */
export const SafetyVerdictSchema = z.object({
  component: z.string(),
  allowed: z.array(z.enum(SURFACES)),
  blocked: z.array(z.enum(SURFACES)),
  blocked_actions: z.array(z.string()).describe("Specific actions that must never be recommended"),
  reasons: z.array(z.string()),
  rule_ids: z.array(z.string()),
  disposal_only: z.boolean().describe("True = the only safe path is guided disposal"),
});
export type SafetyVerdict = z.infer<typeof SafetyVerdictSchema>;

export const SourceSchema = z.object({
  label: z.string(),
  url: z.string().optional(),
});

export const ActionStepSchema = z.object({
  text: z.string(),
  quantity: z.string().optional(),
});

export const LocalOptionSchema = z.object({
  name: z.string(),
  type: z.string(),
  area: z.string(),
  distance_km: z.number().optional(),
  contact: z.string().optional(),
  url: z.string().optional(),
  note: z.string().optional(),
});

/** Stage 5 — one of the three ranked actions. */
export const ActionSchema = z.object({
  kind: z.enum(ACTION_KINDS),
  title: z.string(),
  why: z.string().describe("Why this fits the item / user"),
  steps: z.array(ActionStepSchema).default([]),
  effort: z.enum(["low", "medium", "high"]).default("low"),
  time: z.string().optional(),
  safety_note: z.string(),
  sources: z.array(SourceSchema).default([]),
  local: z.array(LocalOptionSchema).default([]),
});
export type Action = z.infer<typeof ActionSchema>;

export const ImpactSchema = z.object({
  kg_diverted: z.number(),
  co2e_grams_avoided: z.number(),
  equivalent: z.string().describe("Human-friendly, e.g. '≈ 12 phone charges'"),
});
export type Impact = z.infer<typeof ImpactSchema>;

/** Final response streamed to the client. */
export const AnalysisResultSchema = z.object({
  id: z.string(),
  identification: IdentificationSchema,
  needs_clarification: z.boolean(),
  components: z.array(ComponentSchema),
  safety: z.array(SafetyVerdictSchema),
  actions: z.array(ActionSchema),
  impact: ImpactSchema.optional(),
  degraded: z.array(z.string()).default([]).describe("Which enrichments were unavailable"),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
