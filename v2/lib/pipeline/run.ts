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
    const res = await identifyImage(input.image);
    identification = res.identification;
    needsClarification = res.needsClarification;
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
