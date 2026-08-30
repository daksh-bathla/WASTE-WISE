import { runEval } from "@/eval/run";
import { SAFETY_RULES } from "@/lib/safety/rules";

export type CaseRow = {
  id: string;
  label: string;
  trap: boolean;
  pass: boolean;
  mode: "vision" | "fixture";
  expectedBlockedActions: string[];
  failures: string[];
};

export type SafetyStats = {
  total: number;
  passed: number;
  traps: number;
  trapsPassed: number;
  leaks: number;
  allTrapsPass: boolean;
  ruleCount: number;
  p95LatencyMs: number;
  visionCases: number;
  rows: CaseRow[];
  /** Headline triple, single source of truth for /safety and the landing page. */
  headline: { cases: number; traps: number; leaks: number };
};

let cached: { at: number; value: SafetyStats } | null = null;
const TTL_MS = 30_000;

/**
 * Runs the real eval suite and shapes it for display. The suite is fast in
 * fixture mode (p95 ~1ms) so this is cheap to call per request; a short TTL
 * cache keeps repeated renders from re-running it.
 */
export async function getSafetyStats(): Promise<SafetyStats> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const { results, summary } = await runEval();
  const { CASES } = await import("@/eval/cases");
  const byId = new Map(CASES.map((c) => [c.id, c]));

  const rows: CaseRow[] = results
    .map((r) => ({
      id: r.id,
      label: r.label,
      trap: r.trap,
      pass: r.pass,
      mode: r.mode,
      expectedBlockedActions: byId.get(r.id)?.expectedBlockedActions ?? [],
      failures: r.failures,
    }))
    .sort((a, b) => Number(b.trap) - Number(a.trap) || a.label.localeCompare(b.label));

  const traps = results.filter((r) => r.trap);
  const value: SafetyStats = {
    total: summary.total,
    passed: summary.passed,
    traps: traps.length,
    trapsPassed: traps.filter((r) => r.pass).length,
    leaks: summary.safetyLeaks,
    allTrapsPass: summary.trapPassRate === 1,
    ruleCount: SAFETY_RULES.length,
    p95LatencyMs: summary.p95LatencyMs,
    visionCases: summary.visionCases,
    rows,
    headline: {
      cases: summary.total,
      traps: traps.length,
      leaks: summary.safetyLeaks,
    },
  };

  cached = { at: Date.now(), value };
  return value;
}
