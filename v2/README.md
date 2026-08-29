# WasteWise 2.0

Snap a photo of anything you're about to throw away → **3 ranked, safe, cited actions**
(Reuse · Pass On · Dispose) with real Delhi NCR options.

**The differentiator:** every recommendation passes a **deterministic safety gate** the
LLM cannot override, and an **automated eval suite** (`npm test`) fails CI if the model
ever recommends a blocked action (e.g. puncturing a lithium battery).

## Run

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (optional — see below)
npm run dev
```

Open http://localhost:3000.

Without `GEMINI_API_KEY`: identification is skipped and ranking uses the deterministic
heuristic. The safety gate, decomposition, local lookup, impact math, and the full eval
suite all run offline — that's how CI runs.

## Verify

```bash
npm test         # unit tests + safety regression suite (30 cases, 10 traps)
npm run eval     # human-readable eval report + latency/citation metrics
npm run typecheck
npm run build
```

## Architecture

```
app/api/analyze  →  lib/pipeline/run.ts
   identify (Gemini)  →  decompose (rules)  →  safety gate (rules, lib/safety)
   →  retrieve (lib/knowledge)  →  rank 3 actions (Gemini + lib/safety/leak guard)
   →  impact (lib/impact coefficients)  →  local options (lib/local, Delhi NCR)
```

- `lib/safety/` — deterministic rules + gate + negation-aware leak detector. Unit-tested.
- `eval/cases.ts` — 20 labelled cases (10 traps). `eval/run.ts` scores them.
- `schemas/analysis.ts` — Zod contracts shared client/server; LLM output validated against them.
- `data/knowledge.json` — retrieval corpus. `data/delhi-ncr.json` — curated facilities.
