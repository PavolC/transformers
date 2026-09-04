// The workbench: the learner's one growing Python file, and everything that
// reads or writes it.
//
// src/state/workbenchDoc.ts owns the format (the marker regex, the join rule,
// the splices). This file owns the stored copy: how it would be created out of
// older per-exercise documents (a legacy path this course never exercises), how a section is seeded the first time the
// learner reaches it, what gets lent when a section is not written yet, and
// what each payoff panel is handed.

import { SECTION_BODIES, startingBody } from "../exercises/skeletons";
import preludeSource from "../python/workbench_prelude.py?raw";
import { get, keysUnder, remove, set, BACKUP } from "./storage";
import { SECTIONS, SECTION_BY_ID, SECTION_ORDER, assemble, closure, givensFor, hashBody, lineMap, parseDocument, projection, upsertSection, type ParsedDoc, type SectionDef } from "./workbenchDoc";

/** The file's header: its docstring and its one import. Lives here rather than
 * in workbenchDoc.ts so that file has no bundler-specific imports and the
 * tools can run its splices directly. */
export const PRELUDE = preludeSource.replace(/\s+$/, "");

const DOC_KEY = "code:workbench";
const SCRATCH_KEY = "code:scratch";
const UNDO_KEY = "code:undo-workbench";
const passKey = (id: string) => `code:passhash-${id}`;

/** Keys under tf:v1: that a progress file must not carry. The undo buffer is
 * one document's previous state; exporting it means "Undo that" on another
 * machine restores a stranger's file over the current one. */
export const NOT_EXPORTED = new Set([UNDO_KEY]);

// ---------------------------------------------------------------- the document

let cached: { text: string; doc: ParsedDoc } | null = null;

/** Parsed once per document string. codeReady() is called by nine panels on
 * every progress event, and each call would otherwise re-scan 20 KB. */
export function parsed(text: string): ParsedDoc {
	if (cached && cached.text === text) return cached.doc;
	const doc = parseDocument(text);
	cached = { text, doc };
	return doc;
}

export function loadDocument(): string {
	return get(DOC_KEY) ?? "";
}

export function currentDoc(): ParsedDoc {
	return parsed(loadDocument());
}

export function loadScratch(): string {
	return get(SCRATCH_KEY) ?? "";
}

export function saveScratch(text: string): void {
	set(SCRATCH_KEY, text);
}

const DOC_EVENT = "tf:workbench";

/** Notify anything showing the document that it changed underneath.
 * `source` lets the editor ignore the echo of its own writes. */
function announce(source: string): void {
	window.dispatchEvent(new CustomEvent(DOC_EVENT, { detail: { source } }));
}

export function subscribeDocument(fn: (source: string) => void): () => void {
	const handler = (e: Event) => fn((e as CustomEvent).detail?.source ?? "");
	window.addEventListener(DOC_EVENT, handler);
	return () => window.removeEventListener(DOC_EVENT, handler);
}

export function saveDocument(text: string, source = "editor"): void {
	set(DOC_KEY, text);
	cached = null;
	scheduleProjections();
	announce(source);
}

// ------------------------------------------------------------------ migration

/** Lines the older per-exercise documents carry that the one file supplies
 * once, at the top. Left in place they would rebind a name the learner's own
 * earlier section defines, which is the bug the workbench exists to remove. */
const DEMOTE = [/^\s*import numpy as np\s*$/, /^\s*from course import\b/, /^\s*import course\s*$/];

/** One saved per-exercise document, turned into a section body. */
export function demote(raw: string): string {
	const kept = raw.split("\n").filter((line) => !DEMOTE.some((re) => re.test(line)));
	// Those lines usually sat together under the docstring, so removing them
	// leaves a stack of blank lines where the imports were.
	return kept
		.join("\n")
		.replace(/^\s+/, "")
		.replace(/\n{3,}/g, "\n\n\n")
		.replace(/\s+$/, "");
}

export interface MigrationReport {
	ran: boolean;
	/** Sections built out of an older per-exercise document. */
	adopted: string[];
	/** How many import lines were dropped in the process. */
	droppedImports: number;
}

function countDropped(raw: string): number {
	return raw.split("\n").filter((line) => DEMOTE.some((re) => re.test(line))).length;
}

/** Build the one file, once, out of whatever this browser already holds.
 *
 * Called at App mount, at the end of importProgress and at the end of
 * resetAll. That last one matters: resetAll removes every key under the work
 * prefix, the document included, and a browser with no document is a browser
 * with no editor.
 */
export function ensureLibrary(force = false): MigrationReport {
	const existing = get(DOC_KEY);
	if (!force && existing !== null) return { ran: false, adopted: [], droppedImports: 0 };

	const adopted: string[] = [];
	const bodies = new Map<string, string>();
	let droppedImports = 0;

	for (const section of SECTIONS) {
		if (section.kind === "given") continue;
		const raw = get(`code:${section.id}`);
		if (raw === null || raw.trim() === "") continue;
		// Insurance, taken before anything is rewritten, under a prefix a
		// progress file never carries.
		set(`code:${section.id}`, raw, BACKUP);
		droppedImports += countDropped(raw);
		bodies.set(section.id, demote(raw));
		adopted.push(section.id);
	}

	// A section written for you arrives with the exercise that needs it, so the
	// file is runnable exactly as far as the learner has got.
	for (const id of adopted) {
		for (const given of givensFor(id)) bodies.set(given, startingBody(given));
	}
	// Anything an adopted section calls into but that was never opened still
	// needs its marker, or the file would call a name that is not there. The
	// course lends the body until the learner writes it.
	for (const id of [...adopted]) {
		for (const req of closure(id)) {
			if (!bodies.has(req) && SECTION_BY_ID.get(req)?.kind === "given") {
				bodies.set(req, startingBody(req));
			}
		}
	}

	if (adopted.length) set(BACKUP + "at", new Date().toISOString(), "");
	const text = assemble(bodies, PRELUDE);
	set(DOC_KEY, text);
	if (get(SCRATCH_KEY) === null) set(SCRATCH_KEY, "");
	cached = null;

	// A section that passed before the merge passed with the text it now holds.
	for (const id of adopted) {
		if (get(`done:${id}`) === "1") {
			const body = bodies.get(id);
			if (body !== undefined) set(passKey(id), hashBody(body));
		}
	}

	refreshProjections();
	announce("migration");
	return { ran: true, adopted, droppedImports };
}

/** True while the pre-workbench copies are still recoverable. */
export function hasBackup(): boolean {
	return get("at", BACKUP) !== null;
}

export function clearBackup(): void {
	for (const key of keysUnder(BACKUP)) remove(key, BACKUP);
}

/** Put the nine per-exercise documents back the way they were before the
 * merge, and rebuild the file from them. */
export function restoreBackup(): boolean {
	if (!hasBackup()) return false;
	let restored = 0;
	for (const section of SECTIONS) {
		const raw = get(`code:${section.id}`, BACKUP);
		if (raw === null) continue;
		set(`code:${section.id}`, raw);
		restored++;
	}
	if (!restored) return false;
	remove(DOC_KEY);
	ensureLibrary(true);
	return true;
}

// -------------------------------------------------------------------- sections

/** Make sure a section exists in the file, seeding it if it does not. */
export function ensureSection(id: string): void {
	const def = SECTION_BY_ID.get(id);
	if (!def) return;
	let text = loadDocument();
	if (text.trim() === "") text = PRELUDE + "\n";
	let doc = parsed(text);
	let changed = false;
	// A given section arrives with the exercise that needs it, so the file
	// always runs as it stands.
	for (const wanted of [...givensFor(id), id]) {
		const present = doc.byId.get(wanted);
		// A section that is present but holds nothing under its marker was
		// seeded by a build whose body table had no entry for it (CASEBOOK.md
		// 34), and the learner has written nothing there to lose. Re-seed it.
		if (present && (present.body.trim() !== "" || startingBody(wanted) === "")) continue;
		text = upsertSection(text, wanted, startingBody(wanted)).text;
		doc = parseDocument(text);
		changed = true;
	}
	if (changed) saveDocument(text, "seed");
}

export function sectionBody(id: string): string | null {
	return currentDoc().byId.get(id)?.body ?? null;
}

export function sectionPresent(id: string): boolean {
	return currentDoc().byId.has(id);
}

/** The section still reads exactly as the course seeded it. */
export function isUntouched(id: string): boolean {
	const body = sectionBody(id);
	if (body === null) return true;
	return body.replace(/\s+$/, "") === startingBody(id);
}

/** Does the section define every name it promises?
 *
 * A pass mark plus a deleted function is a real state: the panels that run
 * the learner's code would unlock and then die on a missing name.
 */
export function sectionDefines(id: string): boolean {
	const body = sectionBody(id);
	if (body === null) return false;
	const def = SECTION_BY_ID.get(id);
	if (!def) return false;
	return def.provides.every((name) => new RegExp(`^\\s*def\\s+${name}\\s*\\(`, "m").test(body));
}

export type SectionState = "missing" | "written" | "passing" | "stale";

export function sectionState(id: string): SectionState {
	if (!sectionPresent(id)) return "missing";
	if (get(`done:${id}`) !== "1") return "written";
	const body = sectionBody(id) ?? "";
	const hash = get(passKey(id));
	// No stored hash means the pass predates the workbench; take it at its word
	// rather than showing every returning learner a wall of amber.
	if (hash === null) return "passing";
	return hash === hashBody(body) ? "passing" : "stale";
}

export function markPassed(id: string): void {
	const body = sectionBody(id);
	if (body !== null) set(passKey(id), hashBody(body));
}

export function clearPassHash(id: string): void {
	remove(passKey(id));
}

/** A section written for you that has been edited. Its numbers are pinned in
 * the tests above and below it, so a change there misblames the learner's own
 * code, and nothing else would say so. */
export function editedGivens(): SectionDef[] {
	return SECTIONS.filter((s) => s.kind === "given" && sectionPresent(s.id) && !isUntouched(s.id));
}

// --------------------------------------------------------------------- splices

function snapshotForUndo(text: string): void {
	set(UNDO_KEY, text);
}

export function canUndo(): boolean {
	return get(UNDO_KEY) !== null;
}

export function undoLastSplice(): boolean {
	const previous = get(UNDO_KEY);
	if (previous === null) return false;
	remove(UNDO_KEY);
	saveDocument(previous, "undo");
	return true;
}

export interface SpliceResult {
	ok: boolean;
	/** Why not, in a sentence worth showing the reader. */
	reason?: string;
	from?: number;
	to?: number;
}

export interface MultiSpliceResult extends SpliceResult {
	merged: string[];
}

/** Replace several sections as one operation, with one Undo snapshot.
 *
 * Progress imports use this rather than calling putSection in a loop: every
 * splice is prepared in memory first, so a later malformed section cannot
 * leave half an import in storage, and Undo restores the document from before
 * the whole import rather than only the final replacement.
 */
export function putSections(bodies: Iterable<readonly [id: string, body: string]>, source = "splice"): MultiSpliceResult {
	const original = currentDoc();
	let text = original.text;
	const merged: string[] = [];

	for (const [id, body] of bodies) {
		const doc = parsed(text);
		const problem = doc.problems.find((p) => p.kind !== "out-of-order" && (p.id === undefined || p.id === id));
		if (problem) {
			return {
				ok: false,
				merged: [],
				reason: `${problem.message} Fix that first: replacing a section in a file whose section lines do not parse could take a neighbouring one with it.`,
			};
		}
		const spliced = upsertSection(text, id, body);
		if (spliced.text !== text) {
			text = spliced.text;
			merged.push(id);
		}
	}

	if (text !== original.text) {
		snapshotForUndo(original.text);
		saveDocument(text, source);
	}
	return { ok: true, merged };
}

/** Replace one section's body, keeping one level of undo.
 *
 * Gated on a clean parse, because a splice into a file whose markers are
 * mangled can take a neighbouring section with it.
 */
export function putSection(id: string, body: string): SpliceResult {
	const doc = currentDoc();
	const problem = doc.problems.find((p) => p.kind !== "out-of-order" && (p.id === undefined || p.id === id));
	if (problem) {
		return {
			ok: false,
			reason: `${problem.message} Fix that first: replacing a section in a file whose section lines do not parse could take a neighbouring one with it.`,
		};
	}
	snapshotForUndo(doc.text);
	const spliced = upsertSection(doc.text, id, body);
	saveDocument(spliced.text, "splice");
	return { ok: true, from: spliced.from, to: spliced.to };
}

/** Put a section back to the text the course seeded it with. */
export function resetSection(id: string): SpliceResult {
	const result = putSection(id, startingBody(id));
	if (result.ok) {
		remove(`done:${id}`);
		remove(`reveal:${id}`);
		clearPassHash(id);
	}
	return result;
}

// ------------------------------------------------------------------- projections

/** The prelude plus every section up to and including this one.
 *
 * This is what a payoff panel executes. It is also written back to the older
 * per-exercise key, so a build that predates the workbench, or an export
 * opened in one, still finds runnable code where it expects it.
 */
export function projectionFor(id: string): string {
	return projection(loadDocument(), id);
}

let projectionTimer: number | null = null;

function scheduleProjections(): void {
	if (projectionTimer !== null) window.clearTimeout(projectionTimer);
	projectionTimer = window.setTimeout(() => {
		projectionTimer = null;
		refreshProjections();
	}, 400);
}

export function refreshProjections(): void {
	const doc = currentDoc();
	for (const section of SECTIONS) {
		if (section.kind === "given") continue;
		if (!doc.byId.has(section.id)) continue;
		const text = projection(doc.text, section.id);
		if (get(`code:${section.id}`) !== text) set(`code:${section.id}`, text);
	}
}

// ---------------------------------------------------------------- the run spec

/** Which names the course lends for a run targeting this section.
 *
 * A section the learner has not touched is not their work, so the course
 * lends its copy and the run says so. Never a name the target owns, and never
 * one the target's own tests examine directly, since either would let a lend
 * report success about code that is not written.
 */
export function lendFor(target: string): string[] {
	const def = SECTION_BY_ID.get(target);
	if (!def) return [];
	const doc = currentDoc();
	const owned = new Set([...def.provides, ...def.checks]);
	const names: string[] = [];
	for (const id of closure(target)) {
		if (id === target) continue;
		const section = SECTION_BY_ID.get(id);
		if (!section) continue;
		// A section written for you is the real thing wherever it sits in the
		// file; only an exercise section can be present but untouched.
		if (doc.byId.has(id) && (section.kind === "given" || !isUntouched(id))) continue;
		for (const name of section.provides) if (!owned.has(name)) names.push(name);
	}
	return [...new Set(names)].sort();
}

/** Which names the course lends to the scratch pad.
 *
 * The pad belongs to no exercise, so there is no target to compute a lend
 * list around: every section the learner has not written is lent, not just
 * the ones some exercise happens to call into. Chapter 2's prompt asks the
 * reader to draw a batch and then look its pairs up in chapter 1's tally,
 * and count_pairs is not in get-batch's closure, so a reader who had not
 * done chapter 1 would have met a NameError instead of a lend.
 *
 * Nothing the learner has written is ever lent over: an untouched or absent
 * section is not their work, and the panel names what it borrowed.
 */
export function lendForScratch(): string[] {
	const doc = currentDoc();
	const names: string[] = [];
	for (const section of SECTIONS) {
		if (doc.byId.has(section.id) && (section.kind === "given" || !isUntouched(section.id))) continue;
		names.push(...section.provides);
	}
	return [...new Set(names)].sort();
}

export interface RunSpec {
	target: string;
	sections: ReturnType<typeof lineMap>;
	lend: string[];
}

export function runSpec(target: string): RunSpec {
	return { target, sections: lineMap(currentDoc()), lend: lendFor(target) };
}

/** The spec for a scratch-pad run: the same shape, a whole-file lend list.
 * The target is only used to report which section an error landed in. */
export function scratchSpec(target: string): RunSpec {
	return { target, sections: lineMap(currentDoc()), lend: lendForScratch() };
}

/** The sections `target` runs on, nearest first: where to look when a failure
 * is not in the section being worked on. */
export function upstreamOf(target: string): SectionDef[] {
	const ids = closure(target);
	ids.delete(target);
	return SECTION_ORDER.filter((id) => ids.has(id))
		.map((id) => SECTION_BY_ID.get(id))
		.filter((s): s is SectionDef => s !== undefined)
		.reverse();
}

// ---------------------------------------------------------------- the download

/** What "Download my nn.py" writes.
 *
 * The notice is unconditional. The app cannot know which sections were typed
 * and which came from "Put this solution in my file", and eight of the nine
 * reference solutions carry an attribution to Nielsen's MIT-licensed code.
 * Shipping that code without its notice is a licence defect.
 */
export function downloadText(notice: string): string {
	return `${notice.replace(/\s+$/, "")}\n\n${loadDocument().replace(/^\s+/, "")}`;
}

export { SECTIONS, SECTION_BY_ID, SECTION_ORDER, SECTION_BODIES };
