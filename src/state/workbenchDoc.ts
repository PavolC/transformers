// The workbench document: one growing Python file, divided into sections by
// marker comments. This file owns the format. Nothing else in the app parses
// the document, and tools/workbench.py reads the marker regex out of this
// file rather than restating it, so there is one definition of what a section
// line looks like.
//
// The join rule, mirrored in tools/workbench.py:
//
//   document = [prelude, section, section, ...] joined by two blank lines
//   section  = marker + one blank line + body
//
// Markers are metadata for editing and reporting, never for running. Every
// run, every download and every panel takes the whole string and does not
// look at a marker, so a mangled marker degrades features and can never
// break execution or lose code.

import sectionTable from "../exercises/sections.json";

const MARKER_RE = /^#[ \t]*-{2,}[ \t]*\[section:([a-z0-9-]+)\][^\n]*$/gm;

export const JOIN = "\n\n\n";

export type SectionKind = "exercise" | "given";

export interface SectionDef {
  id: string;
  kind: SectionKind;
  /** The module this section is written in, for linking and for labels. */
  module: string;
  /** "Module 5, Backpropagation": what the reader sees in the rail. */
  label: string;
  /** The exact marker line. Stored rather than templated, so the app and the
   * checker cannot format it two ways. */
  marker: string;
  /** Top-level names the section defines. Used for lending and for the check
   * that a passed section still defines what it claims. */
  provides: string[];
  /** Section ids this one calls into. */
  requires: string[];
  /** Given sections only: the exercise sections whose arrival brings this one
   * into the file, so the file is runnable as it stands at every point. */
  pulledInBy: string[];
  /** Names owned by an EARLIER section that this one's tests examine
   * directly, so the course must not lend its own copy of them. Module 7's
   * seam test is the only one: it asks whether the learner's own Module 5
   * backprop has been opened up, and a lent copy already has been. */
  checks: string[];
}

/** The given sections an exercise section brings with it. */
export function givensFor(id: string): string[] {
  return SECTIONS.filter((s) => s.pulledInBy.includes(id)).map((s) => s.id);
}

export const SECTIONS: SectionDef[] = sectionTable as SectionDef[];
export const SECTION_BY_ID: ReadonlyMap<string, SectionDef> = new Map(
  SECTIONS.map((s) => [s.id, s]),
);
export const SECTION_ORDER: string[] = SECTIONS.map((s) => s.id);

/** One section as found in a document. Offsets are into the document string;
 * lines are 1-based and inclusive, which is what the Python harness wants. */
export interface ParsedSection {
  id: string;
  /** Null when the document names a section this course does not have. */
  def: SectionDef | null;
  label: string;
  kind: SectionKind | "unknown";
  /** Character offset of the marker line's first character. */
  from: number;
  /** Character offset just past the section's last character. */
  to: number;
  /** Character offset of the first character after the marker line. */
  bodyFrom: number;
  startLine: number;
  endLine: number;
  /** Everything after the marker line, trailing whitespace trimmed. */
  body: string;
}

export type ProblemKind =
  | "unknown-section"
  | "duplicate-section"
  | "out-of-order"
  | "missing-prelude";

export interface Problem {
  kind: ProblemKind;
  id?: string;
  line: number;
  message: string;
}

export interface ParsedDoc {
  text: string;
  prelude: string;
  sections: ParsedSection[];
  byId: Map<string, ParsedSection>;
  problems: Problem[];
  /** True when every marker is one this course knows, appears once, and the
   * header is intact. Splices are gated on this. */
  clean: boolean;
}

function lineOf(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/** Total: never throws, whatever the learner has done to the file. */
export function parseDocument(text: string): ParsedDoc {
  const hits: { id: string; from: number; bodyFrom: number }[] = [];
  MARKER_RE.lastIndex = 0;
  for (let m = MARKER_RE.exec(text); m !== null; m = MARKER_RE.exec(text)) {
    const from = m.index;
    const after = from + m[0].length;
    // Past the marker's own newline, and past the blank line the join rule
    // puts under it. Without the second step every parsed body starts with a
    // newline that sectionText would then add again: a section would grow a
    // blank line on every splice, and no body would ever compare equal to the
    // text it was seeded with, so nothing would ever count as untouched.
    let bodyFrom = after + (text[after] === "\n" ? 1 : 0);
    while (/^[ \t]*\n/.test(text.slice(bodyFrom, bodyFrom + 40))) {
      bodyFrom += text.slice(bodyFrom).indexOf("\n") + 1;
    }
    hits.push({ id: m[1], from, bodyFrom });
    // A zero-length match would spin forever; the pattern cannot produce one
    // (it needs "[section:" at minimum), but lastIndex is shared state.
    if (MARKER_RE.lastIndex === from) MARKER_RE.lastIndex = from + 1;
  }

  const problems: Problem[] = [];
  const sections: ParsedSection[] = [];
  const byId = new Map<string, ParsedSection>();
  const seen = new Set<string>();

  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    const to = i + 1 < hits.length ? hits[i + 1].from : text.length;
    const def = SECTION_BY_ID.get(hit.id) ?? null;
    const startLine = lineOf(text, hit.from);
    const section: ParsedSection = {
      id: hit.id,
      def,
      label: def?.label ?? hit.id,
      kind: def?.kind ?? "unknown",
      from: hit.from,
      to,
      bodyFrom: hit.bodyFrom,
      startLine,
      endLine: startLine + text.slice(hit.from, to).split("\n").length - 1,
      body: text.slice(hit.bodyFrom, to).replace(/\s+$/, ""),
    };
    sections.push(section);
    if (!def) {
      problems.push({
        kind: "unknown-section",
        id: hit.id,
        line: startLine,
        message: `line ${startLine} names a section this course does not have: ${hit.id}`,
      });
    } else if (seen.has(hit.id)) {
      problems.push({
        kind: "duplicate-section",
        id: hit.id,
        line: startLine,
        message: `${def.label} has two section lines, at line ${byId.get(hit.id)?.startLine} and line ${startLine}. The first one is the one the course reads.`,
      });
    } else {
      seen.add(hit.id);
      byId.set(hit.id, section);
    }
  }

  // Out of order is a reading problem, never a running one: Python looks a
  // name up when the call happens, not when the file is read.
  const positions = sections
    .filter((s) => s.def && byId.get(s.id) === s)
    .map((s) => SECTION_ORDER.indexOf(s.id));
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] < positions[i - 1]) {
      const s = sections.filter((x) => x.def && byId.get(x.id) === x)[i];
      problems.push({
        kind: "out-of-order",
        id: s.id,
        line: s.startLine,
        message: `${s.label} sits above a section that comes before it in the course. Your file still runs; it just reads out of order.`,
      });
      break;
    }
  }

  const prelude = hits.length ? text.slice(0, hits[0].from) : text;
  if (!/^import numpy as np\s*$/m.test(prelude)) {
    problems.push({
      kind: "missing-prelude",
      line: 1,
      message: "the top of your file no longer imports NumPy, so nothing below it can run.",
    });
  }

  return {
    text,
    prelude,
    sections,
    byId,
    problems,
    clean: problems.every((p) => p.kind === "out-of-order"),
  };
}

export function sectionText(def: SectionDef, body: string): string {
  return `${def.marker}\n\n${body.replace(/\s+$/, "")}`;
}

/** A document holding exactly these sections, in table order. */
export function assemble(bodies: ReadonlyMap<string, string>, prelude: string): string {
  const parts = [prelude.replace(/\s+$/, "")];
  for (const def of SECTIONS) {
    const body = bodies.get(def.id);
    if (body !== undefined) parts.push(sectionText(def, body));
  }
  return parts.join(JOIN) + "\n";
}

/** Where a section belongs in a document that does not have it yet: just
 * after the last present section that precedes it. */
function insertionOffset(doc: ParsedDoc, id: string): number {
  const rank = SECTION_ORDER.indexOf(id);
  let offset = doc.sections.length ? doc.sections[0].from : doc.text.length;
  for (const s of doc.sections) {
    if (!s.def) continue;
    if (SECTION_ORDER.indexOf(s.id) < rank) offset = s.to;
  }
  return offset;
}

export interface Splice {
  text: string;
  /** The range the new section occupies, for revealing it in the editor. */
  from: number;
  to: number;
}

/** Put a section's body into the document, inserting the section if absent. */
export function upsertSection(text: string, id: string, body: string): Splice {
  const def = SECTION_BY_ID.get(id);
  if (!def) return { text, from: 0, to: 0 };
  const doc = parseDocument(text);
  const piece = sectionText(def, body);
  const existing = doc.byId.get(id);
  if (existing) {
    const before = text.slice(0, existing.from);
    // A section runs to the start of the next marker, so its slice carries the
    // blank lines between the two. The replacement has its trailing whitespace
    // trimmed, so the separator has to be put back: without it the next
    // section's marker lands at the end of this section's last line, where the
    // parser cannot see it, and that section silently disappears into this one.
    const after = text.slice(existing.to);
    const tail = after.length ? JOIN : "\n";
    return {
      text: before + piece + tail + after,
      from: existing.from,
      to: existing.from + piece.length,
    };
  }
  const at = insertionOffset(doc, id);
  const head = text.slice(0, at).replace(/\s+$/, "");
  const tail = text.slice(at).replace(/^\s+/, "");
  const before = head + JOIN;
  const merged = before + piece + (tail ? JOIN + tail : "\n");
  return { text: merged, from: before.length, to: before.length + piece.length };
}

/** The prelude plus every present section up to and including this one.
 *
 * This is what a payoff panel executes and what the older per-exercise
 * storage key holds, so a build that predates the workbench still finds
 * runnable code where it expects it.
 */
export function projection(text: string, throughId: string): string {
  const doc = parseDocument(text);
  // Through the section itself and anything written for you that arrives
  // with it: Module 5's adapter sits below backprop in the file, and a panel
  // asked for the backprop projection needs it.
  const rank = Math.max(
    SECTION_ORDER.indexOf(throughId),
    ...givensFor(throughId).map((id) => SECTION_ORDER.indexOf(id)),
  );
  if (rank < 0) return text;
  const parts = [doc.prelude.replace(/\s+$/, "")];
  for (const s of doc.sections) {
    if (!s.def || doc.byId.get(s.id) !== s) continue;
    if (SECTION_ORDER.indexOf(s.id) > rank) continue;
    parts.push(sectionText(s.def, s.body));
  }
  return parts.join(JOIN) + "\n";
}

/** A section id and everything it needs, transitively. */
export function closure(id: string, into = new Set<string>()): Set<string> {
  if (into.has(id)) return into;
  into.add(id);
  for (const req of SECTION_BY_ID.get(id)?.requires ?? []) closure(req, into);
  return into;
}

/** Those sections, everything they call into, and the given sections that
 * arrive alongside them, in table order: what the learner's file holds once
 * these exercises have been opened. Mirrors with_givens in
 * tools/workbench.py, which check_exercises.py runs; the two must agree on
 * what "everything backprop runs on" means, because given-batch is pulled in
 * by backprop without being in its requires. */
export function withGivens(ids: readonly string[]): string[] {
  const want = new Set<string>();
  const todo = [...ids];
  while (todo.length) {
    const id = todo.pop()!;
    if (want.has(id)) continue;
    want.add(id);
    todo.push(...closure(id), ...givensFor(id));
  }
  return SECTION_ORDER.filter((id) => want.has(id));
}

/** The line ranges the Python harness wants, 1-based and inclusive. */
export function lineMap(doc: ParsedDoc) {
  return doc.sections.map((s) => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    start: s.startLine,
    end: s.endLine,
  }));
}

/** FNV-1a, so a section body can be compared against the one that passed. */
export function hashBody(body: string): string {
  let h = 0x811c9dc5;
  const text = body.replace(/\s+$/, "");
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
