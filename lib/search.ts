/**
 * Tiny dependency-free fuzzy matcher. Scores substring > word-prefix >
 * subsequence matches; returns -1 for no match.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 0;

  const idx = t.indexOf(q);
  if (idx !== -1) {
    // Exact substring: earlier and tighter is better.
    return 1000 - idx - (t.length - q.length) * 0.1;
  }

  // Word-prefix match across words ("kill ses" → "kill session").
  const words = q.split(/\s+/);
  if (words.length > 1 && words.every((w) => t.includes(w))) {
    return 500 - t.length * 0.1;
  }

  // Subsequence match.
  let ti = 0;
  let gaps = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    gaps += found - ti;
    ti = found + 1;
  }
  return 100 - gaps - t.length * 0.05;
}

export interface Searchable {
  /** Primary text to match against. */
  text: string;
  /** Secondary texts (aliases), matched at a slight penalty. */
  extra?: string[];
}

export function bestScore(query: string, item: Searchable): number {
  let best = fuzzyScore(query, item.text);
  for (const alias of item.extra ?? []) {
    const s = fuzzyScore(query, alias);
    if (s > 0) best = Math.max(best, s * 0.9);
  }
  return best;
}
