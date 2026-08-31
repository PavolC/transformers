/** One exercise, named without pulling in its Python.
 *
 * The exercise objects themselves carry a skeleton, a test suite and a
 * solution as strings, so importing all of them to list their titles would
 * put every line of course Python in the first chunk the reader downloads.
 * This is the list, and nothing else. The ids are the localStorage keys, so
 * they must match the `id` in each exercise's index.ts, and the chapter ids
 * must match src/chapters/index.ts. Neither can be checked here without
 * importing the thing this file exists to avoid importing, so
 * tools/check_exercises.py checks both from outside the bundle.
 */
export interface ExerciseRef {
  id: string;
  title: string;
  /** Chapter id from CHAPTERS, for linking. */
  module: string;
  /** What the learner ends up with, in one line. */
  builds: string;
}

export const EXERCISES: ExerciseRef[] = [
  {
    id: "count-pairs",
    title: "Counting pairs",
    module: "c1",
    builds: "count_pairs: the tally, one row per character, over any stream",
  },
  {
    id: "sample-next",
    title: "Sampling the next character",
    module: "c1",
    builds: "sample_next: a draw from one row of the tally, in proportion",
  },
  {
    id: "build-vocab",
    title: "Text to ids, and back",
    module: "c2",
    builds: "build_vocab, encode, decode: the crossing between text and arrays",
  },
  {
    id: "get-batch",
    title: "Batches of windows",
    module: "c2",
    builds: "get_batch: B windows of T characters, with their shifted targets",
  },
  {
    id: "softmax",
    title: "Softmax",
    module: "c4",
    builds: "softmax: scores into a guess list, stable against overflow",
  },
];
