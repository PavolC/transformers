import { lazy, type ComponentType } from "react";

export interface ChapterDef {
  id: string;
  navLabel: string;
  /** The start page's outline line: what this chapter covers. One copy, here,
   * so the front door renders from the registry and can never disagree with
   * the tabs (course one's front page once claimed ten modules over a list of
   * eight). */
  title: string;
  covers: string;
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
    navLabel: "1 · The next-letter game",
    title: "The next-letter game",
    covers:
      "Language modelling as one game: guess the next character. The tally of what follows " +
      "what, built by hand on one line and then over a million characters of Shakespeare, " +
      "writing by drawing from it, and what a model with one row per character cannot know.",
    ...deferred(() => import("./chapter1").then((m) => ({ default: m.Chapter1 }))),
  },
  {
    id: "c4",
    navLabel: "4 · The learned tally",
    title: "The learned tally",
    covers:
      "The bigram rebuilt as a trained model: scores, softmax, the loss's clean gradient, " +
      "and training that recovers what counting knew. (Being written; its softmax exercise " +
      "is live below as the pipeline's first passenger.)",
    ...deferred(() => import("./chapter4").then((m) => ({ default: m.Chapter4 }))),
  },
];
