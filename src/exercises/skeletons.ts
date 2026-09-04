// The starting text of every section, and nothing else.
//
// The workbench seeds a section the first time the learner reaches it, which
// has to happen without loading that exercise's tests and reference solution,
// so those stay in each exercise's own index.ts and its own chunk. This file
// is the skeletons alone, plus any section written for the learner, which has
// one body rather than two.
//
// Derived from the folders rather than listed by hand. The hand-written list
// this replaced was missing chapter 3's exercise, so opening it seeded a
// marker and nothing under it, and no checker read this file (CASEBOOK.md
// 34). A glob cannot forget a folder; tools/check_exercises.py asserts the
// glob is still what this file uses.

/** Every src/exercises/<id>/skeleton.py, keyed by its path. */
const SKELETONS = import.meta.glob<string>("./*/skeleton.py", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** Every src/exercises/given/<name>.py, the one body of section given-<name>. */
const GIVENS = import.meta.glob<string>("./given/*.py", {
  query: "?raw",
  import: "default",
  eager: true,
});

function idOf(path: string): string {
  const m = /^\.\/([^/]+)\/([^/]+)\.py$/.exec(path);
  if (!m) throw new Error(`skeletons: unexpected path ${path}`);
  return m[1] === "given" ? `given-${m[2]}` : m[1];
}

/** Section id to the body it starts life with. */
export const SECTION_BODIES: Readonly<Record<string, string>> = Object.fromEntries(
  [...Object.entries(SKELETONS), ...Object.entries(GIVENS)].map(([path, text]) => [idOf(path), text]),
);

export function startingBody(id: string): string {
  return (SECTION_BODIES[id] ?? "").replace(/\s+$/, "");
}
