import corpus from "@/data/knowledge.json";
import type { Identification, Surface } from "@/schemas/analysis";

export type KnowledgeEntry = {
  id: string;
  keywords: string[];
  surface: Surface;
  title: string;
  body: string;
  source: { label: string; url: string };
};

const ENTRIES = corpus as KnowledgeEntry[];

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2);
}

/** Keyword-overlap retrieval. Small corpus → no embeddings needed. */
export function retrieveKnowledge(identification: Identification, allowedSurfaces: Surface[], limit = 4): KnowledgeEntry[] {
  const hay = new Set(
    tokenize([identification.item, identification.category, ...identification.materials].join(" ")),
  );
  const allow = new Set<Surface>([...allowedSurfaces, "none"]);

  const scored = ENTRIES.map((e) => {
    const phraseHit = e.keywords.some((k) => identification.item.toLowerCase().includes(k) || k.includes(identification.item.toLowerCase()));
    const tokenHits = e.keywords.flatMap(tokenize).filter((t) => hay.has(t)).length;
    let score = (phraseHit ? 50 : 0) + tokenHits * 8;
    if (!allow.has(e.surface)) score -= 40;
    return { e, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.e);
}
