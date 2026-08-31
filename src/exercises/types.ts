/** A prompt is paragraphs of plain text, with optional runnable code blocks
 * (rendered copyable, with an append-to-editor button). */
export type PromptPart = string | { code: string };

export interface Exercise {
  id: string;
  title: string;
  /** Short prose beats shown above the editor. */
  prompt: PromptPart[];
  skeleton: string;
  tests: string;
  solution: string;
  /** A test whose pass deserves a prominent banner (Module 5's gradient
   * check is the course's flagship correctness guarantee). */
  flagship?: { test: string; note: string };
  /** Three-stage reveal: [conceptual nudge, pseudocode/structure]. Stage 3
   * is the full solution above. */
  hints: [string, string];
  /** A bundled dataset this exercise's snippets read, fetched into the
   * runtime before a run. Module 10's prompt says to open /penguins.json,
   * and nothing had ever put it there. */
  dataUrl?: string;
}
