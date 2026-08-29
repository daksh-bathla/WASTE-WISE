# TODOS

## Demo (post-CEO-review 2026-08-29)

### P2
- **Shareable impact receipt** — post-scan card (kg diverted, CO2e, safe action) + WhatsApp share. Blocked on firmer impact coefficients.
- **Real server-side streaming** — replace the faked stage ticker with true streamed pipeline stages.

### P3
- **Hindi / regional voice output** — TTS on any result (ElevenLabs + browser fallback).
- **Scripted low-confidence clarify beat** — make the blurry-photo → one-question path demo-reliable.

## Long-term (approach A — advisor + routing)
### P3
- Real handoffs into Kabadiwala / Cashify / Attero / Goonj / gaushala directory.
- Personal ledger: rupee value recovered + kg diverted + monthly household report.
- Community-corrected knowledge wiki (every "I tried this" rating improves the next answer).
- SEO item pages generated from the knowledge base ("what to do with a broken geyser in Delhi").

## Long-term (approach C — safety standard)
### P4
- Publish "WasteWise Safety Standard" writeup with eval methodology + numbers.
- Offer the classification + safety-gate API to other apps and municipalities.

## Known gaps (from ship review)
### P2
- `lib/ai/identify.ts` — empty/blocked Gemini vision response throws → API 500 instead of graceful message.
### P3
- `data/delhi-ncr.json` — facility contacts are curated, unverified.
- `lib/impact/coefficients.ts` — CO2e factors are rough demo estimates, undocumented sources.
- React components (`ResultView`, page states) have no test harness (needs jsdom + @testing-library/react).
