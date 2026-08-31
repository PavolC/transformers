import type { ReactNode } from "react";

/** One row of the notation reference on the front page.
 *
 * The rule that keeps this honest (CLAUDE.md, "Notation and vocabulary"):
 * **every new symbol or coined term gets its row in the same change that
 * introduces it.** Chapters are written assuming weeks pass between them, and
 * a symbol defined once four thousand words ago is not defined for a reader
 * coming back. Course one back-filled 36 rows after all ten chapters existed
 * and then found 7 more (CASEBOOK.md 8); starting the table empty on day one
 * costs nothing.
 *
 * `alsoCalled` is the field's name for the thing, rendered as a muted line
 * under the meaning rather than as a fourth column, because two columns of
 * prose pan the whole lookup at the prose measure. A coined word also hands
 * over to the field's word in the chapter that earns it, in prose; this line
 * is the lookup, not the handover (CASEBOOK.md 17).
 */
export interface NotationRow {
  id: string;
  /** The glyph, the shape or the code spelling, as the reader meets it. */
  symbol: ReactNode;
  /** One line. What it means, in the course's own words. */
  means: string;
  /** What everyone outside this course calls it, when that differs. */
  alsoCalled?: string;
  /** The chapter that introduced it: "Chapter 1". */
  from: string;
}

/** Empty until chapter 1 lands, and then in the order a reader meets them.
 * Never alphabetical: the lookup is read down the way the course is read. */
export const NOTATION: NotationRow[] = [];
