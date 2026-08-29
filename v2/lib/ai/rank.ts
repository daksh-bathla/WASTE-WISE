import { z } from "zod";
import {
  ActionSchema,
  ACTION_KINDS,
  type Action,
  type Identification,
  type SafetyVerdict,
} from "@/schemas/analysis";
import type { KnowledgeEntry } from "@/lib/knowledge/retrieve";
import type { LocalOptionSchema } from "@/schemas/analysis";
import { generateStructured, geminiAvailable } from "./gemini";
import { isDisposalOnlyScan } from "@/lib/safety/gate";
import { mentionsUnsafely } from "@/lib/safety/leak";

type LocalOption = z.infer<typeof LocalOptionSchema>;

const RankOutputSchema = z.object({ actions: z.array(ActionSchema).min(1).max(3) });

const SYSTEM = `You are the recommendation stage of WasteWise (India). You produce at most three
actions for a scanned waste item: exactly one "reuse", one "pass_on", and one "dispose"
— unless the safety gate says the item is disposal-only, in which case produce only
"dispose" guidance.

HARD RULES (violating any is a critical failure):
- Never recommend, in a title or any step, an action on the BLOCKED list.
- Only suggest a surface (body/food/animal/plant/craft) that is in the ALLOWED list for that component.
- Every action must cite at least one source from the provided knowledge, or a clearly named public source.
- Every step must be concrete: include a quantity or measurable detail and an action verb.
- If you are not sure something is safe, do not suggest it. Prefer fewer, safer actions.`;

function buildPrompt(
  identification: Identification,
  safety: SafetyVerdict[],
  knowledge: KnowledgeEntry[],
  local: LocalOption[],
): string {
  const blocked = [...new Set(safety.flatMap((s) => s.blocked_actions))];
  const allowed = [...new Set(safety.flatMap((s) => s.allowed))];
  const disposalOnly = isDisposalOnlyScan(safety);

  return `ITEM: ${identification.item} (category: ${identification.category}, condition: ${identification.condition})
MATERIALS: ${identification.materials.join(", ") || "unknown"}
HAZARDS: ${identification.hazards.join(", ") || "none noted"}

SAFETY GATE:
- disposal_only: ${disposalOnly}
- ALLOWED surfaces: ${allowed.join(", ") || "none"}
- BLOCKED actions (never mention): ${blocked.join(" | ") || "none"}
- reasons: ${safety.flatMap((s) => s.reasons).join(" ") || "n/a"}

KNOWLEDGE (cite these):
${knowledge.map((k, i) => `[${i + 1}] ${k.title} — ${k.body} (source: ${k.source.label}${k.source.url ? " " + k.source.url : ""})`).join("\n") || "none"}

LOCAL OPTIONS (Delhi NCR — use in pass_on / dispose "local" field):
${local.map((l) => `- ${l.name} (${l.type}, ${l.area})${l.note ? " — " + l.note : ""}`).join("\n") || "none"}

Reply with ONLY JSON: { "actions": [ { "kind", "title", "why", "steps":[{"text","quantity"}], "effort", "time", "safety_note", "sources":[{"label","url"}], "local":[{"name","type","area","note","url"}] } ] }
${disposalOnly ? "This item is disposal-only: return 1 dispose action." : "Return up to 3 actions, one per kind."}`;
}

/** Strip any action/step that RECOMMENDS a blocked phrase. Last line of defence after the LLM. */
export function enforceSafety(actions: Action[], safety: SafetyVerdict[]): Action[] {
  const blocked = [...new Set(safety.flatMap((s) => s.blocked_actions))];
  const leaks = (text: string) => blocked.some((b) => mentionsUnsafely(text, b));
  const disposalOnly = isDisposalOnlyScan(safety);

  let cleaned = actions
    .map((a) => ({
      ...a,
      steps: a.steps.filter((s) => !leaks(s.text)),
    }))
    .filter((a) => {
      if (leaks(a.title)) return false;
      if (disposalOnly && a.kind !== "dispose") return false;
      return a.steps.length > 0 || a.kind === "dispose";
    });

  // De-dupe by kind, keep first of each.
  const seen = new Set<string>();
  cleaned = cleaned.filter((a) => (seen.has(a.kind) ? false : (seen.add(a.kind), true)));
  return cleaned;
}

export async function rankActions(input: {
  identification: Identification;
  safety: SafetyVerdict[];
  knowledge: KnowledgeEntry[];
  local: LocalOption[];
}): Promise<{ actions: Action[]; source: "ai" | "heuristic" }> {
  if (geminiAvailable) {
    try {
      const { data } = await generateStructured({
        schema: RankOutputSchema,
        system: SYSTEM,
        prompt: buildPrompt(input.identification, input.safety, input.knowledge, input.local),
        grounding: true,
        temperature: 0.3,
      });
      const actions = enforceSafety(data.actions, input.safety);
      if (actions.length) return { actions, source: "ai" };
    } catch {
      /* fall through to heuristic */
    }
  }
  return { actions: heuristicActions(input), source: "heuristic" };
}

/** Deterministic fallback so the pipeline (and eval) works with no API key. */
export function heuristicActions(input: {
  identification: Identification;
  safety: SafetyVerdict[];
  knowledge: KnowledgeEntry[];
  local: LocalOption[];
}): Action[] {
  const { identification: id, safety, knowledge, local } = input;
  const disposalOnly = isDisposalOnlyScan(safety);
  const src = knowledge[0]?.source ?? { label: "WasteWise knowledge base", url: "" };

  const dispose: Action = {
    kind: "dispose",
    title: disposalOnly ? `Take ${id.item} to the right facility` : `Dispose of what can't be reused`,
    why: safety.flatMap((s) => s.reasons)[0] ?? "Route the remainder through the correct waste stream.",
    steps: [
      { text: `Keep ${id.item} in its original container; do not mix with other waste.` },
      local[0]
        ? { text: `Hand it to ${local[0].name} (${local[0].area}).` }
        : { text: `Use your municipal hazardous / e-waste collection point.` },
    ],
    effort: "low",
    safety_note: safety.flatMap((s) => s.reasons)[0] ?? "Follow local disposal rules.",
    sources: [src],
    local,
  };

  if (disposalOnly) return [dispose];

  const allowed = new Set(safety.flatMap((s) => s.allowed));
  const reuse: Action = {
    kind: "reuse",
    title: knowledge.find((k) => allowed.has(k.surface))?.title ?? `Reuse ${id.item} at home`,
    why: "Keeps a usable material in service and out of the waste stream.",
    steps:
      knowledge
        .filter((k) => allowed.has(k.surface))
        .slice(0, 1)
        .map((k) => ({ text: k.body })) || [{ text: `Clean ${id.item} thoroughly and repurpose for storage or crafts.` }],
    effort: "low",
    safety_note: `Only for the allowed uses: ${[...allowed].join(", ") || "handle with care"}.`,
    sources: knowledge.slice(0, 1).map((k) => k.source),
    local: [],
  };

  const passOn: Action = {
    kind: "pass_on",
    title: local[0] ? `Give it to ${local[0].name}` : `Donate or sell it on`,
    why: "Someone nearby can use it directly — the highest-value outcome after reuse.",
    steps: local[0]
      ? [{ text: `Contact ${local[0].name} (${local[0].area})${local[0].note ? ` — ${local[0].note}` : ""}.` }]
      : [{ text: `Offer it to your building's kabadiwala or a local donation drive.` }],
    effort: "low",
    safety_note: "Clean and describe the condition honestly before passing it on.",
    sources: [src],
    local,
  };

  return enforceSafety([reuse, passOn, dispose], safety);
}

export { ACTION_KINDS };
