/**
 * Fetch freely-licensed eval photos from Wikimedia Commons.
 *
 *   npx tsx eval/fetch-photos.mts            # fill missing slots
 *   npx tsx eval/fetch-photos.mts --force    # re-download everything
 *
 * Only CC0 / public-domain / CC-BY / CC-BY-SA files are accepted. Attribution
 * for every downloaded file is written to eval/cases/photos/CREDITS.md.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "cases", "photos");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "WasteWise-eval-fetch/1.0 (hackathon test fixtures)";

/** Search terms per eval case id, most specific first. */
const SLOTS: Record<string, string[]> = {
  // ---- traps ----
  "trap-lithium-battery": ["18650 lithium ion battery cell", "lithium polymer battery pouch", "li-ion battery"],
  "trap-mouldy-bread": ["mouldy bread", "moldy bread slice", "bread mold Rhizopus"],
  "trap-expired-medicine": ["blister pack tablets", "medicine blister pack pills", "pharmaceutical blister packaging"],
  "trap-avocado": ["avocado stone seed halved", "avocado cut in half pit", "avocado seed"],
  "trap-onion-garlic": ["onions and garlic", "red onion", "garlic"],
  "trap-bleach-bottle": ["bleach bottle", "household bleach container", "sodium hypochlorite bottle"],
  "trap-rusty-blade": ["rusty blade knife", "rusted razor blade", "rusty utility knife"],
  "trap-cfl-tube": ["compact fluorescent lamp", "broken fluorescent tube", "CFL bulb"],
  "trap-aerosol": ["aerosol spray can", "deodorant aerosol can", "spray paint can"],
  "trap-wet-paint-tin": ["paint can container", "paint bucket tin metal", "paint tin"],
  // ---- normal ----
  "ok-banana-peel": ["banana peel", "banana skin"],
  "ok-glass-jar": ["empty glass jar", "glass mason jar"],
  "ok-plastic-bottle": ["PET plastic bottle", "empty plastic water bottle"],
  "ok-cardboard-box": ["cardboard box", "corrugated cardboard box"],
  "ok-old-phone": ["smartphone front view", "mobile phone handset", "nokia mobile phone"],
  "ok-broken-charger": ["usb power adapter charger plug", "mobile phone charger adapter", "usb wall charger"],
  "ok-newspaper": ["stack of newspapers", "old newspapers pile"],
  "ok-dry-aa-battery": ["AA alkaline batteries", "used AA battery"],
};

/**
 * Slots with no usable freely-licensed match on Commons — every candidate was a
 * drawing, a museum artifact, or the wrong subject (wheelie bins for "peelings").
 * Shoot these yourself; until then the eval falls back to their fixtures.
 */
const SHOOT_YOURSELF = ["ok-cotton-tshirt", "ok-veg-peels"];

const FREE = /^(cc0|cc-zero|public domain|pd|cc by|cc by-sa|cc-by|cc-by-sa)/i;

/** Icons, logos, diagrams and artwork are useless as vision fixtures — we need photos. */
const JUNK_TITLE =
  /icon|farm-fresh|logo|svg|nuvola|crystal clear|oxygen480|tango |emblem|symbol|diagram|chart|map of|tekening|drawing|sketch|painting|illustration|engraving|art\.iwm|woodcut|etching|cartoon|clipart|poster/i;
const MIN_WIDTH = 640;
const MIN_BYTES = 20_000;

type Candidate = { title: string; url: string; width: number; license: string; artist: string; page: string };

const strip = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Commons rate-limits aggressively; back off and retry on 429/5xx. */
async function politeFetch(url: string, attempt = 0): Promise<Response> {
  await sleep(1200);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const wait = 3000 * 2 ** attempt;
    console.log(`   ${res.status} — backing off ${wait / 1000}s`);
    await sleep(wait);
    return politeFetch(url, attempt + 1);
  }
  return res;
}

async function search(term: string): Promise<Candidate[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `filetype:bitmap ${term}`,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size",
    iiurlwidth: "1024",
  });
  const res = await politeFetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`search failed ${res.status}`);
  const json = (await res.json()) as {
    query?: { pages?: Record<string, { title: string; imageinfo?: Array<Record<string, unknown>> }> };
  };
  const pages = Object.values(json.query?.pages ?? {});

  return pages.flatMap((p) => {
    const ii = p.imageinfo?.[0];
    if (!ii) return [];
    const meta = (ii.extmetadata ?? {}) as Record<string, { value?: string }>;
    const license = String(meta.LicenseShortName?.value ?? "").trim();
    const url = String(ii.thumburl ?? ii.url ?? "");
    if (!url) return [];
    return [
      {
        title: p.title,
        url,
        width: Number(ii.thumbwidth ?? ii.width ?? 0),
        license,
        artist: strip(String(meta.Artist?.value ?? "Unknown")),
        page: String(ii.descriptionurl ?? ""),
      },
    ];
  });
}

async function download(url: string): Promise<Buffer> {
  // A 1024px thumb may need on-demand rendering, which Commons rate-limits hard.
  // Fall back to widths that are more likely already cached.
  const variants = [url, ...[800, 640, 1280].map((w) => url.replace(/\/\d+px-/, `/${w}px-`))];
  let lastStatus = 0;
  for (const candidate of [...new Set(variants)]) {
    const res = await politeFetch(candidate);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    lastStatus = res.status;
  }
  throw new Error(`download failed ${lastStatus}`);
}

const force = process.argv.includes("--force");
/** Optional slot-id filters: `npx tsx eval/fetch-photos.mts trap-avocado ok-veg-peels` */
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

mkdirSync(OUT, { recursive: true });

const credits: string[] = [];
const failures: string[] = [];

for (const [id, terms] of Object.entries(SLOTS)) {
  if (only.length && !only.includes(id)) continue;
  const dest = join(OUT, `${id}.jpg`);
  if (existsSync(dest) && !force) {
    console.log(`skip   ${id} (already present)`);
    continue;
  }

  let picked: Candidate | null = null;
  for (const term of terms) {
    let results: Candidate[] = [];
    try {
      results = await search(term);
    } catch (e) {
      console.log(`  search error for "${term}": ${(e as Error).message}`);
      continue;
    }
    picked = results.find((r) => FREE.test(r.license) && r.width >= MIN_WIDTH && !JUNK_TITLE.test(r.title)) ?? null;
    if (picked) break;
  }

  if (!picked) {
    failures.push(id);
    console.log(`MISS   ${id} — no freely-licensed match`);
    continue;
  }

  try {
    const buf = await download(picked.url);
    if (buf.length < MIN_BYTES) throw new Error(`too small (${buf.length}B) — likely an icon`);
    writeFileSync(dest, buf);
    const kb = Math.round(buf.length / 1024);
    console.log(`ok     ${id}.jpg  ${kb}KB  [${picked.license}]  ${picked.title}`);
    credits.push(
      `| \`${id}.jpg\` | [${picked.title.replace("File:", "")}](${picked.page}) | ${picked.artist} | ${picked.license} |`,
    );
  } catch (e) {
    failures.push(id);
    console.log(`FAIL   ${id} — ${(e as Error).message}`);
  }
}

// Rewrite CREDITS.md: newly fetched rows + previously recorded rows, but only
// for files that actually exist on disk (so deleted/rejected picks are pruned).
{
  const creditsPath = join(OUT, "CREDITS.md");
  const rowId = (row: string) => row.slice(row.indexOf("`") + 1, row.indexOf(".jpg`") + 4);
  const existingRows = (existsSync(creditsPath) ? readFileSync(creditsPath, "utf8") : "")
    .split("\n")
    .filter((l) => l.startsWith("| `"));

  const byFile = new Map<string, string>();
  for (const row of existingRows) byFile.set(rowId(row), row);
  for (const row of credits) byFile.set(rowId(row), row); // fresh wins

  const rows = [...byFile.entries()]
    .filter(([file]) => existsSync(join(OUT, file)))
    .map(([, row]) => row)
    .sort();

  writeFileSync(
    creditsPath,
    `# Eval photo credits

All images sourced from Wikimedia Commons under free licences and used here as
test fixtures. Regenerate with \`npx tsx eval/fetch-photos.mts\`.

| file | source | author | licence |
|---|---|---|---|
${rows.join("\n")}
`,
  );
  console.log(`\nwrote CREDITS.md (${rows.length} entries)`);
}

if (failures.length) {
  console.log(`\n${failures.length} slot(s) still empty: ${failures.join(", ")}`);
  console.log("Rerun (Commons rate-limits), or shoot them yourself.");
}

const stillNeeded = SHOOT_YOURSELF.filter((id) => !existsSync(join(OUT, `${id}.jpg`)));
if (stillNeeded.length) {
  console.log(`\nNo good free photo exists for: ${stillNeeded.join(", ")}`);
  console.log("Shoot these yourself — see photos/README.md. Fixtures cover them meanwhile.");
}
