# WasteWise

Photograph something you're about to throw away, get three safe, cited actions
(Reuse / Pass on / Dispose) with real Delhi NCR options.

## Repo layout — read this first

- `v2/` — **the active rebuild.** Next.js + TypeScript. All new work goes here.
- `frontend/`, `backend/` — the legacy React/Vite + Express app. Reference only.
- `wastewise/` — a stale full duplicate of the legacy app. Do not edit; slated for removal.

## v2 orientation

- `lib/safety/` — deterministic hazard rules. The LLM may explain a block, never
  overturn one. This is the differentiator; change it only with tests.
- `eval/` — 20 labelled cases, 10 of them hazard traps. `npm run eval` scores the
  real pipeline; a trap leaking a blocked action fails the build.
- `eval/cases/photos/` — real photos. With `GEMINI_API_KEY` set those cases run
  through the live vision stage; without it they fall back to fixtures, which is
  what CI does.
- `schemas/` — Zod contracts shared client/server; LLM output is validated against them.
- Dev preview: `GET /api/analyze?demo=<case-id>` runs the real pipeline from a
  fixture, so the UI is inspectable without an API key. 404s in production.

Before landing anything in `v2`: `npm run lint && npx tsc --noEmit && npm test && npm run eval`.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
