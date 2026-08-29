import type { Component, Identification, SafetyVerdict, Surface } from "@/schemas/analysis";
import { SURFACES } from "@/schemas/analysis";
import { SAFETY_RULES, type RuleContext } from "./rules";

const REAL_SURFACES = SURFACES.filter((s) => s !== "none") as Exclude<Surface, "none">[];

function buildText(identification: Identification, component: Component): string {
  return [
    identification.item,
    identification.brand,
    identification.category,
    identification.condition,
    ...identification.materials,
    ...identification.expiry_signals,
    ...identification.hazards,
    component.name,
    component.material,
    component.condition,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Run every deterministic rule against one component and union the results.
 * Conservative: a surface is `allowed` only if NO rule blocked it.
 */
export function evaluateComponent(identification: Identification, component: Component): SafetyVerdict {
  const ctx: RuleContext = { identification, component, text: buildText(identification, component) };

  const blockedSurfaces = new Set<Surface>();
  const blockedActions = new Set<string>();
  const reasons: string[] = [];
  const ruleIds: string[] = [];
  let disposalOnly = false;

  for (const rule of SAFETY_RULES) {
    const hit = rule.test(ctx);
    if (!hit) continue;
    ruleIds.push(rule.id);
    reasons.push(hit.reason);
    hit.blockSurfaces?.forEach((s) => blockedSurfaces.add(s));
    hit.blockActions?.forEach((a) => blockedActions.add(a));
    if (hit.disposalOnly) disposalOnly = true;
  }

  // Damaged / expired / contaminated conditions with no explicit rule still
  // lose body + food surfaces by default posture.
  if (["mouldy", "contaminated", "expired"].includes(component.condition)) {
    blockedSurfaces.add("body");
    blockedSurfaces.add("food");
    if (reasons.length === 0) reasons.push("Condition is compromised; skin and food-contact reuse are not safe.");
  }

  const allowed = disposalOnly
    ? []
    : REAL_SURFACES.filter((s) => !blockedSurfaces.has(s));

  return {
    component: component.name,
    allowed,
    blocked: disposalOnly ? [...REAL_SURFACES] : [...blockedSurfaces],
    blocked_actions: [...blockedActions],
    reasons,
    rule_ids: ruleIds,
    disposal_only: disposalOnly,
  };
}

export function evaluateSafety(identification: Identification, components: Component[]): SafetyVerdict[] {
  return components.map((c) => evaluateComponent(identification, c));
}

/** All blocked-action phrasings across the scan — passed to the ranker as hard constraints. */
export function collectBlockedActions(verdicts: SafetyVerdict[]): string[] {
  return [...new Set(verdicts.flatMap((v) => v.blocked_actions))];
}

/** True when every component is disposal-only. */
export function isDisposalOnlyScan(verdicts: SafetyVerdict[]): boolean {
  return verdicts.length > 0 && verdicts.every((v) => v.disposal_only);
}
