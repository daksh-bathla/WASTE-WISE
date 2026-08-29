/**
 * Detects whether a piece of *recommendation* text tells the user to do a
 * blocked action. Negated mentions ("do not puncture", "never compost") are
 * NOT leaks — they're safety guidance.
 */
const NEGATORS = ["do not", "don't", "dont", "never", "avoid", "not ", "no ", "without", "instead of", "rather than"];

export function mentionsUnsafely(text: string, phrase: string): boolean {
  const hay = text.toLowerCase();
  const needle = phrase.toLowerCase();
  let from = 0;
  for (;;) {
    const idx = hay.indexOf(needle, from);
    if (idx === -1) return false;
    const before = hay.slice(Math.max(0, idx - 24), idx);
    if (!NEGATORS.some((n) => before.includes(n))) return true;
    from = idx + needle.length;
  }
}

export function anyUnsafeMention(text: string, phrases: string[]): string | null {
  for (const p of phrases) if (mentionsUnsafely(text, p)) return p;
  return null;
}
