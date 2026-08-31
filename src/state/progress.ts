// Progress persistence (localStorage, versioned key prefix). Stores the
// learner's one Python file, the hint reveal stage per exercise (0 to 3), and
// a completion flag per exercise. No accounts, no backend (see design doc).
//
// The code used to be nine separate documents under code:<id>. Those keys are
// still written, and still hold runnable Python, but they are now derived: the
// prefix of the workbench up to and including that section. A build that
// predates the workbench, and an export opened in one, therefore still find
// what they expect where they expect it.

import { get, keysUnder, remove, set } from "./storage";
import {
	NOT_EXPORTED,
	clearBackup,
	demote,
	ensureLibrary,
	loadDocument,
	parsed,
	projectionFor,
	putSection,
	putSections,
	refreshProjections,
	resetSection,
	saveDocument,
	sectionDefines,
	sectionPresent,
} from "./workbench";
import { SECTION_BY_ID, withGivens, type SectionDef } from "./workbenchDoc";

/** The prefix of the whole file up to and including this exercise's section.
 *
 * Every payoff panel runs this, so what it runs really is the learner's own
 * earlier work rather than the course's copies of it.
 */
export function loadCode(exerciseId: string): string | null {
	if (!sectionPresent(exerciseId)) return get(`code:${exerciseId}`);
	return projectionFor(exerciseId);
}

/** 0 = nothing revealed, 1 = hint 1, 2 = hint 2, 3 = full solution. */
export function loadRevealStage(exerciseId: string): number {
	const raw = get(`reveal:${exerciseId}`);
	const n = raw === null ? 0 : parseInt(raw, 10);
	return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
}

export function saveRevealStage(exerciseId: string, stage: number): void {
	set(`reveal:${exerciseId}`, String(stage));
}

export function loadCompleted(exerciseId: string): boolean {
	return get(`done:${exerciseId}`) === "1";
}

export function saveCompleted(exerciseId: string): void {
	set(`done:${exerciseId}`, "1");
	emitProgress();
}

// Completion unlocks the payoff panels that run the learner's own code (and
// the start page's progress list), so interested components can subscribe to
// changes. It has never gated navigation: every module is reachable always.
const PROGRESS_EVENT = "tf:progress";

export function emitProgress(): void {
	window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
}

export function subscribeProgress(fn: () => void): () => void {
	window.addEventListener(PROGRESS_EVENT, fn);
	return () => window.removeEventListener(PROGRESS_EVENT, fn);
}

/** One section, ready to be run outside the test harness: an exercise
 * section has passed and still defines what it promised; a written-for-you
 * section just has to be in the file, intact enough to define its names.
 *
 * The passed-present-defines triple can come apart: a progress file that
 * carries the passed marks without the code, storage cleared halfway, or a
 * function deleted out of a section that has already passed. Gating on the
 * pass alone gave the panels an unlocked button that quietly did nothing.
 */
function sectionReady(id: string): boolean {
	const def = SECTION_BY_ID.get(id);
	if (!def) return false;
	if (def.kind === "exercise" && !loadCompleted(id)) return false;
	return sectionPresent(id) && sectionDefines(id);
}

/** Passed, the code that passed is still in the file, and so is everything
 * it runs on.
 *
 * The test harness lends the course's copy of any section the learner has
 * not written, so a pass can be earned out of order: open Module 3 first and
 * sgd goes green with feedforward on loan. The payoff panels have no lending;
 * they exec the projection as it stands, so that same learner's file would
 * die on the missing name. codeReady therefore walks the requires closure
 * plus the given sections that arrive with it, which is exactly the set the
 * projection is asked for.
 */
export function codeReady(exerciseId: string): boolean {
	return withGivens([exerciseId]).every(sectionReady);
}

/** The sections keeping a panel locked, in course order: everything the
 * named exercises run on that is not ready yet. A locked note names these,
 * so it never claims to wait on an exercise the learner has finished. */
export function notReadyFor(exerciseIds: readonly string[]): SectionDef[] {
	const notReady = new Set(withGivens(exerciseIds).filter((id) => !sectionReady(id)));
	return (
		[...notReady]
			.map((id) => SECTION_BY_ID.get(id))
			.filter((s): s is SectionDef => s !== undefined)
			// A given section that is not in the file yet arrives on its own the
			// moment the exercise that pulls it in is opened, so while that exercise
			// is itself on this list, naming the given too is noise. A given that is
			// missing while its exercise is ready really is the thing to name: the
			// learner deleted it, and nothing else would say so.
			.filter((s) => s.kind !== "given" || sectionPresent(s.id) || !s.pulledInBy.some((ex) => notReady.has(ex)))
	);
}

/** Put one section back to its starting text, and clear its marks. */
export function resetExercise(exerciseId: string): { ok: boolean; reason?: string } {
	const result = resetSection(exerciseId);
	if (result.ok) emitProgress();
	return result;
}

/** Forget everything: the file, every hint stage, every pass, and the copies
 * kept from before the exercises became one file. */
export function resetAll(): void {
	for (const key of keysUnder()) remove(key);
	clearBackup();
	ensureLibrary(true);
	emitProgress();
}

export interface ProgressFile {
	format: string;
	saved: string;
	entries: Record<string, string>;
}

// What an export writes, as a frozen literal: a tag computed from anything
// upstream would stop matching every file already exported the moment that
// thing was reworded. "transformers" here is the course's slug, not its
// title, and does not move if the title is reworded.
const FORMAT = "transformers-progress-v1";
const ACCEPTED_FORMATS = [FORMAT];

/** The whole of this browser's progress, as a JSON string to keep or move. */
export function exportProgress(): string {
	refreshProjections();
	const entries: Record<string, string> = {};
	for (const key of keysUnder()) {
		if (NOT_EXPORTED.has(key)) continue;
		const value = get(key);
		if (value !== null) entries[key] = value;
	}
	const file: ProgressFile = {
		format: FORMAT,
		saved: new Date().toISOString(),
		entries,
	};
	return JSON.stringify(file, null, 2);
}

// Only the shapes this course writes, so a hand-edited file cannot fill the
// browser's storage with anything else under our prefix. Frozen: widening it
// would let a file reach keys the app does not expect. Every key the workbench
// added was chosen to fit it already (code:workbench, code:scratch,
// code:passhash-backprop).
const VALID_KEY = /^(code|reveal|done):[a-z0-9-]+$/;

export interface ImportReport {
	written: number;
	/** How the file was shaped, and what happened to the current file. */
	shape: "workbench" | "merged" | "built";
	/** Sections whose text came out of the file rather than out of this
	 * browser, when a file was merged into an existing workbench. */
	merged: string[];
}

/** Load an exported file into the current progress.
 *
 * Additive by key: an exercise present in the file replaces the one in this
 * browser, and one absent from the file is left alone. Returns what happened,
 * or throws with a message worth showing the reader.
 */
export function importProgress(text: string): ImportReport {
	let parsedFile: unknown;
	try {
		parsedFile = JSON.parse(text);
	} catch {
		throw new Error("that file is not JSON, so it is not a progress file this course wrote");
	}
	if (typeof parsedFile !== "object" || parsedFile === null) {
		throw new Error("that file does not hold a progress record");
	}
	const file = parsedFile as Partial<ProgressFile>;
	if (typeof file.format !== "string" || !ACCEPTED_FORMATS.includes(file.format)) {
		throw new Error(`that file says its format is ${JSON.stringify(file.format ?? "missing")}, and this ` + `course reads ${ACCEPTED_FORMATS.join(" or ")}`);
	}
	if (typeof file.entries !== "object" || file.entries === null) {
		throw new Error("that progress file has no entries");
	}

	const incoming = new Map<string, string>();
	for (const [key, value] of Object.entries(file.entries)) {
		if (!VALID_KEY.test(key)) continue;
		if (typeof value !== "string") continue;
		if (NOT_EXPORTED.has(key)) continue;
		incoming.set(key, value);
	}
	if (incoming.size === 0) throw new Error("that progress file holds nothing this course can read");

	const existingDocument = get("code:workbench");
	const hadDocument = existingDocument !== null;
	// Per-exercise code is handled separately: whether it is the file's own
	// section text or a whole standalone document decides where it lands.
	const perExercise = new Map<string, string>();
	for (const [key, value] of incoming) {
		const id = key.startsWith("code:") ? key.slice(5) : null;
		if (key === "code:workbench") continue;
		if (id && SECTION_BY_ID.has(id)) {
			perExercise.set(id, value);
			continue;
		}
		set(key, value);
	}

	let shape: ImportReport["shape"] = "workbench";
	const merged: string[] = [];

	const incomingDocument = incoming.get("code:workbench");
	if (incomingDocument !== undefined) {
		const existingHasSections = existingDocument !== null && parsed(existingDocument).sections.length > 0;
		if (!existingHasSections) {
			// A current file into a fresh browser: restore it byte for byte,
			// including anything the learner put above the first section line.
			saveDocument(incomingDocument, "import");
		} else {
			// A current file into a browser that already has work. Merge the
			// imported sections just like an older export: sections absent from the
			// file stay put, and one Undo restores the whole pre-import document.
			const imported = parsed(incomingDocument);
			const bodies = imported.sections.filter((section) => section.def && imported.byId.get(section.id) === section).map((section) => [section.id, section.body] as const);
			if (bodies.length === 0) {
				throw new Error("that progress file's scribe.py has no course sections to load");
			}
			const result = putSections(bodies, "import");
			if (!result.ok) throw new Error(result.reason ?? "the sections could not be loaded");
			if (result.merged.length > 0) {
				merged.push(...result.merged);
				shape = "merged";
			}
		}
		refreshProjections();
	} else if (!hadDocument) {
		// An older file into a browser that has never built the workbench. The
		// per-exercise documents are what it holds, so write them and merge.
		for (const [id, value] of perExercise) set(`code:${id}`, value);
		remove("code:workbench");
		ensureLibrary(true);
		shape = "built";
	} else {
		// An older file into a browser that already has the workbench. Without
		// this branch the incoming work is written to keys that are about to be
		// overwritten by the projection refresh, and is silently lost.
		set("code:undo-workbench", loadDocument());
		for (const [id, value] of perExercise) {
			const body = extractBody(value, id);
			if (body === null) continue;
			const result = putSection(id, body);
			if (result.ok) merged.push(id);
		}
		refreshProjections();
		shape = "merged";
	}

	emitProgress();
	return { written: incoming.size, shape, merged };
}

/** One section's body out of whatever a progress file stored for it.
 *
 * A file written by this build stores a projection, which carries markers, so
 * the section can be lifted straight out. An older file stores a standalone
 * document with its own imports, which have to come off or they would rebind
 * a name an earlier section defines.
 */
function extractBody(stored: string, id: string): string | null {
	const doc = parsed(stored);
	const section = doc.byId.get(id);
	if (section) return section.body;
	if (doc.sections.length) return null; // a projection that stops short of it
	return demote(stored);
}

export { ensureLibrary, loadDocument, saveDocument };
