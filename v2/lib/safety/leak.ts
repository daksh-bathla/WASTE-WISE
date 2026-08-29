/**
 * Detects whether a piece of *recommendation* text tells the user to do a
 * blocked action. Negated mentions ("do not puncture", "never compost") are
 * NOT leaks — they're safety guidance.
 *
 * A negator only counts when it actually GOVERNS the phrase: it must sit just
 * before it, in the same clause. Scanning a fixed window for bare "no"/"not"
 * silently swallowed real leaks ("no need to worry, then puncture the cell"
 * read as negated), and a missed leak in a safety gate is the dangerous
 * direction — the eval suite would go green on unsafe output.
 */
const NEGATORS = [
  "do not",
  "don't",
  "dont",
  "does not",
  "must not",
  "should not",
  "cannot",
  "can't",
  "won't",
  "never",
  "avoid",
  "without",
  "instead of",
  "rather than",
  "no need to",
];

/** Max characters allowed between the end of a negator and the phrase. */
const GOVERN_GAP = 12;
/** A clause boundary ends a negator's reach. */
const CLAUSE_BREAK = /[.;:!?\n]/;

function isNegated(hay: string, phraseStart: number): boolean {
  const windowStart = Math.max(0, phraseStart - 40);
  const before = hay.slice(windowStart, phraseStart);

  for (const neg of NEGATORS) {
    let searchFrom = 0;
    for (;;) {
      const negIdx = before.indexOf(neg, searchFrom);
      if (negIdx === -1) break;
      const gapText = before.slice(negIdx + neg.length);
      if (gapText.length <= GOVERN_GAP && !CLAUSE_BREAK.test(gapText)) return true;
      searchFrom = negIdx + 1;
    }
  }
  return false;
}

export function mentionsUnsafely(text: string, phrase: string): boolean {
  const hay = text.toLowerCase();
  const needle = phrase.toLowerCase();
  let from = 0;
  for (;;) {
    const idx = hay.indexOf(needle, from);
    if (idx === -1) return false;
    if (!isNegated(hay, idx)) return true;
    from = idx + needle.length;
  }
}

export function anyUnsafeMention(text: string, phrases: string[]): string | null {
  for (const p of phrases) if (mentionsUnsafely(text, p)) return p;
  return null;
}
