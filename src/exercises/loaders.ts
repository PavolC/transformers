// Fetching one exercise's tests without its chapter.
//
// When a run fails, the panel checks whether the cause is a section further
// up the file, by running that section's own suite. Those suites live in
// exercise modules that belong to other chapter chunks, so they are imported
// on demand: the happy path never loads any of this, and a blame pass loads
// only the sections it actually reaches.

import type { Exercise } from "./types";

const LOADERS: Readonly<Record<string, () => Promise<Exercise>>> = {
  "count-pairs": () => import("./count-pairs").then((m) => m.countPairsExercise),
  "sample-next": () => import("./sample-next").then((m) => m.sampleNextExercise),
  "build-vocab": () => import("./build-vocab").then((m) => m.buildVocabExercise),
  "get-batch": () => import("./get-batch").then((m) => m.getBatchExercise),
  softmax: () => import("./softmax").then((m) => m.softmaxExercise),
};

const cache = new Map<string, Promise<Exercise>>();

/** One exercise, loaded once. Null for a section that has no tests of its
 * own, which is every section written for the learner. */
export function loadExercise(id: string): Promise<Exercise> | null {
  const loader = LOADERS[id];
  if (!loader) return null;
  let pending = cache.get(id);
  if (!pending) {
    pending = loader();
    cache.set(id, pending);
  }
  return pending;
}
