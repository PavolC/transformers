// The starting text of every section, and nothing else.
//
// The workbench seeds a section the first time the learner reaches it, which
// has to happen without loading that exercise's tests and reference solution,
// so those stay in each exercise's own index.ts and its own chunk. This file
// is the skeletons alone, plus any section written for the learner, which has
// one body rather than two.

import countPairs from "./count-pairs/skeleton.py?raw";
import sampleNext from "./sample-next/skeleton.py?raw";
import softmax from "./softmax/skeleton.py?raw";

/** Section id to the body it starts life with. */
export const SECTION_BODIES: Readonly<Record<string, string>> = {
  "count-pairs": countPairs,
  "sample-next": sampleNext,
  softmax,
};

export function startingBody(id: string): string {
  return (SECTION_BODIES[id] ?? "").replace(/\s+$/, "");
}
