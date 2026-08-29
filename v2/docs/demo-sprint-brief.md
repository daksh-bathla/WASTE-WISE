# WasteWise Demo Sprint — build brief

Paste this into a fresh Claude Code session started in `/Users/dakshbathla/Downloads/WASTE-WISE`.
It carries everything a cold session needs. Work through the four tasks in order.

---

## Who you are in this repo

You are implementing a hackathon-demo expansion of **WasteWise 2.0**, a Next.js app that
photographs a waste item and returns three safe, cited actions (Reuse / Pass on /
Dispose) with Delhi NCR options. The MVP already shipped (PR #1). Your job is four
specific additions that make the product's differentiator — an eval-gated deterministic
safety gate — visible and dramatic for judges.

## Repo layout — read first

- **`v2/`** — the active app. **All work goes here.** Next.js 16 (App Router), TypeScript,
  Tailwind v4, Vitest, Zod. Read `v2/AGENTS.md` before writing Next code (Next 16 has
  breaking changes; `next dev` regenerates `v2/AGENTS.md` + `v2/CLAUDE.md` — commit them
  with your work, don't fight them).
- `frontend/`, `backend/` — legacy Vite/Express app. Reference only, never edit.
- `wastewise/` — stale full duplicate. Never touch.

## Constraints

- **No push access to `origin`** (`tarangkhandelwal622-cpu/WASTE-WISE`). Push to the
  `fork` remote (`daksh-bathla/WASTE-WISE`), branch `rebuild/wastewise-v2`. PR #1 is open
  into `origin/main` — update its body, don't open new PRs.
- **No `GEMINI_API_KEY` unless the user provides one.** Task 1 needs it; the rest run
  offline against fixtures.
- Pre-land gate, run from `v2/`: `npm run lint && npx tsc --noEmit && npm test && npm run eval`
- CI (`.github/workflows/ci.yml`) runs `npx next typegen` before typecheck — if you add
  a page/route using Next generated types, that's why it works in CI.
- Commit style: conventional prefixes, `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
  on the trailer. Small bisectable commits. Don't `git add -A`.

## What already exists (don't rebuild)

- `lib/pipeline/run.ts` — identify → decompose → safety gate → retrieve → rank → impact.
- `lib/safety/{rules,gate,leak}.ts` — deterministic hazard rules. The LLM may explain a
  block, never overturn one. Change only with tests (`gate.test.ts`, `leak.test.ts`).
- `lib/ai/{gemini,identify,rank}.ts` — Gemini 2.0 Flash client, Zod-validated structured
  output, `enforceSafety` post-filter, heuristic fallback when no key.
- `eval/cases.ts` — 20 labelled cases, 10 hazard traps. `eval/run.ts` scores the real
  pipeline. `eval/eval.test.ts` fails CI on any trap leak.
- `eval/cases/photos/` — 18/20 real photos (all 10 traps), `CREDITS.md`. With a key,
  those cases run live vision; without, fixtures.
- `app/api/analyze/route.ts` — `POST` runs the real pipeline on an uploaded image;
  `GET ?demo=<case-id>` runs it from a fixture (dev only, 404s in prod). Use the GET
  route as the stage fallback if venue wifi dies.
- `app/page.tsx` + `components/ResultView.tsx` — the current single-screen UI.
- `data/knowledge.json` (retrieval corpus), `data/delhi-ncr.json` (curated facilities —
  contacts unverified, spot-check before demo).

## Design system (already established — match it)

`app/globals.css` defines the language: warm paper (`--paper`) + ink (`--ink`),
Instrument Serif display over Inter, hairline rules (`--rule`), no card borders, no
emoji, no gradients. Colour is semantic only: `--hazard` (oxblood) = blocked, `--safe`
(forest) = cleared, `--brass` = accent. Full light + dark token sets. Use `.display`,
`.eyebrow`, `.tnum`, `.rule` utility classes. Theme-aware: define every colour on bare
`:root`, redefine only under the dark blocks.

---

## Task 1 — Wire real Gemini vision (do first, ~30 min)

The demo must run on a photo a judge hands you, not a fixture. This also exercises the
`identify` + `rank` AI paths that currently have zero test coverage.

1. Ask the user for a `GEMINI_API_KEY`. Put it in `v2/.env.local` (gitignored) and tell
   them to add it to the deploy env (Vercel).
2. Run `npm run eval` — cases with photos now route through live vision. Confirm all 10
   traps still pass and `safety leaks` is still 0. If a trap leaks, the live model beat
   `enforceSafety` — that's a real finding, fix `lib/safety/leak.ts` or the gate, don't
   paper over it.
3. Manually: `npm run dev`, upload `eval/cases/photos/trap-lithium-battery.jpg` through
   the UI, confirm the full live pipeline produces a disposal-only result with the
   blocked-action list.
4. **Known gotcha:** Gemini Google Search grounding + `responseMimeType: "application/json"`
   conflict in some API versions. If `rankActions` always falls to heuristic with a key
   set, that's why — try dropping `grounding: true` in `lib/ai/rank.ts:rankActions` or
   switch grounding off and parse text. Verify with `degraded` in the response (`ai_ranking`
   present = fell back).
5. Add a `route.test.ts` case that mocks the Gemini client returning malformed JSON and
   asserts the route returns a graceful error, not a 500. Also fix `lib/ai/identify.ts` —
   an empty/blocked vision response currently throws → API 500; catch it and return
   `needs_clarification` instead.

**Done when:** a judge's photo runs end to end live; `npm run eval` green with the key
set; the identify-failure path returns a clean message.

---

## Task 2 — `/safety` eval page (~2h)

Turn the invisible moat into a page. This is the pitch's proof slide, inside the product.

1. New route `app/safety/page.tsx`, server component. Read `eval/cases.ts` directly for
   the case list. For live results, run `runEval` from `eval/run.ts` at request time
   (it's fast — p95 1ms in fixture mode) or read a committed `eval/last-run.json` you
   generate in a `predev`/CI step. Prefer running it live; fall back to the committed
   file if the import graph fights you.
2. Layout, matching the design system:
   - Headline block: the three numbers — `20 cases`, `10 traps`, `0 leaks` — as
     `.display .tnum`, with `.eyebrow` labels. If any trap fails, the "0 leaks" turns
     `--hazard` and names the leak. This is the honesty of the page.
   - A table: every case, `label`, trap flag (oxblood `.eyebrow` "Hazard"), the
     `expectedBlockedActions`, PASS/FAIL. Traps first.
   - A short section explaining the method in two sentences: deterministic rules the LLM
     can't override + this suite runs in CI on every change.
   - Embed a screen recording (commit `public/eval-fails-on-weak-rule.mp4` or `.gif`) of
     `npm run eval` going red after someone weakens a safety rule. To make the recording:
     temporarily edit `lib/safety/rules.ts` to drop the lithium block, run `npm run eval`,
     screen-capture the red output, revert. ~5 min.
3. Link `/safety` from the landing page (Task 3) and the app footer.

**Done when:** `/safety` renders every case with live pass/fail, the headline numbers
are real and react to failure, the recording plays, and it's linked from the footer.
Add a `safety.page.test.ts` asserting the page lists all 20 cases and flags 10 traps.

---

## Task 3 — Story landing page (~2h)

A judge opening the URL cold currently sees a bare "photograph an item" button. Give
them the pitch in one scroll.

1. Move the current scan UI in `app/page.tsx` to `app/scan/page.tsx` (or a client
   component). `app/page.tsx` becomes the landing.
2. One scroll, top to bottom:
   - **Hero:** the pitch pull-quote. Something like *"Five apps tell you which bin. None
     of them check whether the answer is safe."* + `.display` product name + a "Scan an
     item" CTA linking to `/scan`.
   - **The problem:** two or three sentences. Expired medicine in compost, a lithium cell
     in the household bin, avocado skin as "chicken feed" — the wrong call is common and
     some wrong calls are dangerous.
   - **The pipeline:** an inline SVG diagram of identify → decompose → **safety gate** →
     retrieve → rank → impact, with the safety gate emphasised. Deterministic stages vs
     the two LLM stages, visually distinct.
   - **The proof:** the same three eval numbers as `/safety` (share a helper so they
     can't drift), with a "See the full suite →" link to `/safety`.
   - **Footer:** links to `/safety`, the GitHub PR, a one-line "curated Delhi NCR data,
     verify before relying on it" disclaimer.
3. Keep it theme-aware and mobile-first. This is the surface the Task 4 polish flagships,
   so structure it cleanly but don't over-style yet.

**Done when:** `/` is the story, `/scan` is the tool, the eval numbers on `/` and
`/safety` come from one source, everything works on a 375px viewport.

---

## Task 4 — Design polish pass (~3h, time-box 2 days)

Run `/design-review` against the running app, then execute the findings. Priorities:

1. **Result view (`components/ResultView.tsx`)** — judges dwell here. The safety gate
   should visually dominate the result; blocked actions should read as a hard stop, not
   a footnote. The three action cards need a clear kind hierarchy (Reuse / Pass on /
   Dispose). Check the disposal-only layout separately.
2. **Type + rhythm** — audit the scale in `globals.css`. Instrument Serif at display
   sizes, Inter for everything else, consistent line-height and spacing steps.
3. **States** — empty (no result yet), loading (the staged reveal), error, and the
   low-confidence clarify state all need to look intentional, not default.
4. **Mobile** — 375px through tablet. The result view and the landing especially.
5. **Dark mode** — every surface, every semantic colour, both landing and result.
6. **Motion** — the stage progression on `/scan` is currently a fake ticker. Leave it
   faked (real streaming is deferred) but make the fake smooth and believable.

**Done when:** `/design-review` re-run comes back clean or near-clean, and the result
view reads as "funded product" not "clean side project" on both a phone and a laptop,
light and dark.

---

## After each task

- Pre-land gate green from `v2/`.
- Commit in small bisectable chunks.
- `git push fork rebuild/wastewise-v2`.
- Update PR #1 body (`gh pr edit 1 --repo tarangkhandelwal622-cpu/WASTE-WISE`) with the
  new surface. Never open a new PR.
- Verify in the browser (the Browser pane / preview tools), not by asking the user to check.

## Do not

- Build pickup scheduling, dealer networks, payments, or multi-city facility data. Wrong
  fight — The Kabadiwala and Attero MetalMandi already own the logistics layer.
- Touch `frontend/`, `backend/`, or `wastewise/`.
- Weaken a safety rule to make a test pass.
- Add emoji or gradients to the UI.
