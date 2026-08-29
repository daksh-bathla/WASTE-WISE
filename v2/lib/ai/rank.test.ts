import { describe, it, expect } from "vitest";
import { heuristicActions, enforceSafety } from "./rank";
import type { SafetyVerdict } from "@/schemas/analysis";

const id = (over = {}) => ({
  category: "other" as const,
  item: "ceramic mug",
  materials: ["ceramic"],
  condition: "good" as const,
  expiry_signals: [],
  hazards: [],
  confidence: 0.9,
  ...over,
});

const safe: SafetyVerdict[] = [
  { component: "body", allowed: ["craft", "plant"], blocked: [], blocked_actions: [], reasons: [], rule_ids: [], disposal_only: false },
];

const disposalOnly: SafetyVerdict[] = [
  {
    component: "cell",
    allowed: [],
    blocked: ["body", "food", "animal", "plant", "craft"],
    blocked_actions: ["puncture", "burn", "compost"],
    reasons: ["Lithium cells can ignite."],
    rule_ids: ["lithium-cell"],
    disposal_only: true,
  },
];

describe("heuristicActions", () => {
  it("still returns a reuse action when no knowledge entry matches", () => {
    const actions = heuristicActions({ identification: id(), safety: safe, knowledge: [], local: [] });
    const reuse = actions.find((a) => a.kind === "reuse");
    expect(reuse).toBeDefined();
    expect(reuse!.steps.length).toBeGreaterThan(0);
  });

  it("returns exactly one action, a dispose, for a disposal-only item", () => {
    const actions = heuristicActions({ identification: id(), safety: disposalOnly, knowledge: [], local: [] });
    expect(actions).toHaveLength(1);
    expect(actions[0].kind).toBe("dispose");
  });

  it("gives every action at least one source", () => {
    const actions = heuristicActions({ identification: id(), safety: safe, knowledge: [], local: [] });
    for (const a of actions) expect(a.sources.length).toBeGreaterThan(0);
  });
});

describe("enforceSafety", () => {
  it("drops a step that recommends a blocked action", () => {
    const [kept] = enforceSafety(
      [
        {
          kind: "dispose",
          title: "Dispose safely",
          why: "x",
          steps: [{ text: "Puncture the cell first" }, { text: "Then take it to a facility" }],
          effort: "low",
          safety_note: "n",
          sources: [{ label: "s", url: "" }],
          local: [],
        },
      ],
      disposalOnly,
    );
    expect(kept.steps.map((s) => s.text)).toEqual(["Then take it to a facility"]);
  });

  it("removes a non-dispose action entirely when the item is disposal-only", () => {
    const out = enforceSafety(
      [
        { kind: "reuse", title: "Reuse it", why: "x", steps: [{ text: "keep it" }], effort: "low", safety_note: "n", sources: [{ label: "s", url: "" }], local: [] },
        { kind: "dispose", title: "Take it in", why: "x", steps: [{ text: "hand it over" }], effort: "low", safety_note: "n", sources: [{ label: "s", url: "" }], local: [] },
      ],
      disposalOnly,
    );
    expect(out.map((a) => a.kind)).toEqual(["dispose"]);
  });

  it("keeps only the first action of each kind", () => {
    const dup = (kind: "reuse") => ({
      kind, title: `${kind} A`, why: "x", steps: [{ text: "do a thing" }], effort: "low" as const, safety_note: "n", sources: [{ label: "s", url: "" }], local: [],
    });
    const out = enforceSafety([dup("reuse"), { ...dup("reuse"), title: "reuse B" }], safe);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("reuse A");
  });
});
