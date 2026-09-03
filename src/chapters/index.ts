import { lazy, type ComponentType } from "react";

export interface ChapterDef {
  id: string;
  /** Short, one or two words after the number: the tab strip carries twelve of
   * these, and a strip that cannot fit them either wraps to three rows or pans
   * sideways, which is the worst way to offer a list (BRAND.md). The full name
   * is `title` below. */
  navLabel: string;
  /** The start page's outline line: what this chapter covers. One copy, here,
   * so the front door renders from the registry and can never disagree with
   * the tabs (course one's front page once claimed ten modules over a list of
   * eight). */
  title: string;
  covers: string;
  /** True for a page that exists only to host a finished exercise while its
   * prose is still unwritten. A draft stays out of the tab strip and out of
   * the "continue to" button, because a numbered stub in the navigation reads
   * as a chapter and leaves an unexplained hole where the chapters before it
   * will go ("why is it chapter 1 and then 4?"). It keeps its own address, so
   * #c4 still opens it and the exercise stays reachable, and the front door
   * lists it as being written. METHOD.md: course one shipped its feasibility
   * spike in the nav for three and a half days for want of this. */
  draft?: true;
  Component: ComponentType;
  /** Start fetching this chapter's chunk without rendering it. App calls this
   * on idle for every chapter, so a tab switch never waits on a download. */
  preload?: () => void;
}

function deferred(load: () => Promise<{ default: ComponentType }>) {
  return { Component: lazy(load), preload: () => void load() };
}

/** The chapters that exist so far, in course order. The design doc plans
 * twelve; each is added here as it is written, and the start page's outline,
 * the tabs and the picker all render from this one list. */
export const CHAPTERS: ChapterDef[] = [
  {
    id: "c1",
    navLabel: "1 · Counting",
    title: "The next-letter game",
    covers:
      "Language modelling as one game: guess the next character. The tally of what follows " +
      "what, built by hand on one line and then over a million characters of Shakespeare, " +
      "writing by drawing from it, and what a model with one row per character cannot know.",
    ...deferred(() => import("./chapter1").then((m) => ({ default: m.Chapter1 }))),
  },
  {
    id: "c2",
    navLabel: "2 · Tokens",
    title: "Tokens and the corpus",
    covers:
      "The unit the model reads, priced against reading the same corpus as words. The " +
      "vocabulary as a measurement of one file, the two functions that cross between text " +
      "and ids, and windows of T characters stacked into (B, T) batches with their " +
      "shifted targets.",
    ...deferred(() => import("./chapter2").then((m) => ({ default: m.Chapter2 }))),
  },
  {
    id: "c3",
    navLabel: "3 · Surprise",
    title: "Measuring surprise",
    covers:
      "From counts to probabilities, and from a hit rate to a score that reads the whole " +
      "row: surprise as the bits a guess cost, averaged over text the counting never read. " +
      "The pair that was never seen, the tenth that was held back, and the ladder's first " +
      "three rungs.",
    ...deferred(() => import("./chapter3").then((m) => ({ default: m.Chapter3 }))),
  },
  {
    id: "c4",
    navLabel: "4 · Learning",
    title: "The learned tally",
    covers:
      "The bigram rebuilt as a trained model: scores, softmax, the loss's clean gradient, " +
      "and training that recovers what counting knew.",
    draft: true,
    ...deferred(() => import("./chapter4").then((m) => ({ default: m.Chapter4 }))),
  },
];
