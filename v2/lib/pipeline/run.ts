import { randomUUID } from "node:crypto";
import type { AnalysisResult, Identification } from "@/schemas/analysis";
import { identifyImage } from "@/lib/ai/identify";
import { decompose } from "./decompose";
import { evaluateSafety } from "@/lib/safety/gate";
import { retrieveKnowledge } from "@/lib/knowledge/retrieve";
import { findLocalOptions } from "@/lib/local/lookup";
import { rankActions } from "@/lib/ai/rank";
import { estimateImpact } from "@/lib/impact/coefficients";

export type PipelineInput = {
  image?: { mimeType: string; data: string };
  /** Skip the vision call (eval / retry-with-answer). */
  identification?: Identification;
  coords?: [number, number];
};

/**
 * The full analysis pipeline. Deterministic stages (decompose, safety, impact,
 * local) always run; only identify + rank touch an LLM, and rank degrades to a
 * heuristic when no key is present.
 */
export async function runPipeline(input: PipelineInput): Promise<AnalysisResult> {
  const degraded: string[] = [];

  let identification: Identification;
  let needsClarification = false;

  if (input.identification) {
    identification = input.identification;
  } else if (input.image) {
    try {
      const res = await identifyImage(input.image);
      identification = res.identification;
      needsClarification = res.needsClarification;
    } catch (err) {
      // The vision model errored, was rate-limited, or returned something that
      // could not be validated (a safety block returns empty text). Never 500
      // the request over this — degrade to "ask the user" with a safe stub.
      console.warn("[pipeline] identify failed, asking for clarification:", (err as Error).message);
      identification = {
        category: "other",
        item: "your item",
        materials: [],
        condition: "unknown",
        expiry_signals: [],
        hazards: [],
        confidence: 0,
        clarifying_question:
          "The photo could not be read clearly. Retake it in better light, or tell me what the item is.",
      };
      needsClarification = true;
      degraded.push("vision_failed");
    }
  } else {
    throw new Error("runPipeline requires an image or an identification");
  }

  const components = decompose(identification);
  const safety = evaluateSafety(identification, components);

  if (needsClarification) {
    return {
      id: randomUUID(),
      identification,
      needs_clarification: true,
      components,
      safety,
      actions: [],
      degraded,
    };
  }

  const allowedSurfaces = [...new Set(safety.flatMap((s) => s.allowed))];
  const knowledge = retrieveKnowledge(identification, allowedSurfaces);
  const local = findLocalOptions(identification.category, { coords: input.coords });
  if (!local.length) degraded.push("local_options");

  const { actions, source } = await rankActions({ identification, safety, knowledge, local });
  if (source === "heuristic") degraded.push("ai_ranking");

  const impact = estimateImpact(identification.category);

  return {
    id: randomUUID(),
    identification,
    needs_clarification: false,
    components,
    safety,
    actions,
    impact,
    degraded,
  };
}
