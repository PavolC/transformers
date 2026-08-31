// Shared helpers for the interactive visualizations.

/** Deterministic 32-bit PRNG. Interactives must not depend on Math.random
 * for anything that should replay identically, and a panel's numbers are
 * never quoted in prose anyway: the prose quotes the benches, which run under
 * the pinned Pyodide (CLAUDE.md, "Numbers"). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Map a value from [d0, d1] to [r0, r1]. */
export function scale(v: number, d0: number, d1: number, r0: number, r1: number): number {
  return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

/** How a character is printed inside a figure or a table: a space and a
 * newline both need a visible name, and every chapter has to spell them the
 * same way or the reader meets two vocabularies for one character. */
export function charLabel(ch: string): string {
  if (ch === " ") return "␣";
  if (ch === "\n") return "⏎";
  return ch;
}

/** The same, for a sentence: "a space", "a newline", "'q'". */
export function charName(ch: string): string {
  if (ch === " ") return "a space";
  if (ch === "\n") return "a newline";
  return `'${ch}'`;
}

/** Draw a count as a share of the accent, so a grid cell's weight reads
 * before its number does. 0 leaves the cell the page's own ground. */
export function cellFill(count: number, max: number): string {
  if (count <= 0) return "var(--surface, #fdfdfb)";
  const share = Math.min(1, count / (max || 1));
  // 8% at the faintest so a 1 is still visibly not a 0, 62% at the strongest
  // so the number on top of it stays readable in the two inks.
  const mix = 8 + Math.round(share * 54);
  return `color-mix(in oklab, var(--accent) ${mix}%, var(--bg))`;
}

/** The sorted vocabulary of a text, and the id of each character: the same
 * numbering build_vocab makes, in JavaScript, for panels that show ids. Both
 * sides count characters and sort them, which agrees exactly across the two
 * engines; nothing here is ever quoted in prose (CLAUDE.md, "Numbers"). */
export function vocabOf(text: string): { chars: string[]; index: Map<string, number> } {
  const chars = [...new Set(text)].sort();
  return { chars, index: new Map(chars.map((c, i) => [c, i] as const)) };
}
