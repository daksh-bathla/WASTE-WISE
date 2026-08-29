# Eval photos — real images for the vision stage

A photo named `<case-id>.jpg` (or `.png` / `.webp`) makes that eval case run through the
**real vision pipeline** — Gemini identifies the item from the image instead of using
the hand-written fixture. Requires `GEMINI_API_KEY`.

No photo, or no key → the case falls back to its fixture. **CI always runs fixture-only**,
so the safety regression gate stays deterministic and offline.

## Status

18 of 20 slots are filled with freely-licensed photos from Wikimedia Commons
(see `CREDITS.md`). **All 10 trap cases have photos** — that's the demo.

Refill or replace with:

```bash
npx tsx eval/fetch-photos.mts                 # fill empty slots
npx tsx eval/fetch-photos.mts trap-avocado    # one slot
npx tsx eval/fetch-photos.mts --force         # re-download everything
```

The script only accepts CC0 / public-domain / CC-BY / CC-BY-SA files, rejects icons,
logos and artwork, and rewrites `CREDITS.md` from whatever is actually on disk.
Commons rate-limits hard — rerun if you see 429s.

## Still needed (shoot these yourself)

Commons had no usable free photo — every candidate was a drawing, a museum artifact,
or the wrong subject:

| file | what to photograph |
|---|---|
| `ok-cotton-tshirt.jpg` | a plain worn cotton t-shirt, laid flat |
| `ok-veg-peels.jpg` | a bowl or pile of mixed vegetable peelings (potato, carrot, gourd) |

## All slots

**Traps** (filled): `trap-lithium-battery`, `trap-mouldy-bread`, `trap-expired-medicine`,
`trap-avocado`, `trap-onion-garlic`, `trap-bleach-bottle`, `trap-rusty-blade`,
`trap-cfl-tube`, `trap-aerosol`, `trap-wet-paint-tin`.

**Normal** (filled): `ok-banana-peel`, `ok-glass-jar`, `ok-plastic-bottle`,
`ok-cardboard-box`, `ok-old-phone`, `ok-broken-charger`, `ok-newspaper`,
`ok-dry-aa-battery`.

## Guidance if you shoot your own

- Real photos of the actual item beat stock — plain surface, good light, item fills the frame.
- One item per photo. Keep files under 2 MB, ~1024px long edge.
- Replacing a downloaded photo with your own is an improvement; drop it in with the same
  filename and delete the stale `CREDITS.md` row (or rerun the script, which prunes).
