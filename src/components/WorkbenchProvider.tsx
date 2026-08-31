// The workbench's state, and the context the exercise cards reach it through.
//
// One panel, one editor, one run at a time, for the whole course. The
// exercises are cards in the module pages that point at it; everything that
// runs, prints or reports lives here.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadExercise } from "../exercises/loaders";
import { CORPUS_URL } from "../runtime/assets";
import type { ScratchRunResult, TestRunResult, WorkerResponse } from "../runtime/messages";
import { sendRequest, terminateWorker } from "../runtime/workerClient";
import { emitProgress, saveCompleted } from "../state/progress";
import { loadUi, loadUiFlag, saveUi, saveUiFlag } from "../state/ui";
import { currentDoc, ensureSection, isUntouched, loadDocument, loadScratch, markPassed, runSpec, saveDocument, saveScratch, scratchSpec, sectionPresent, upstreamOf } from "../state/workbench";
import { SECTION_BY_ID, SECTION_ORDER, type SectionDef } from "../state/workbenchDoc";
import { Workbench } from "./Workbench";

/** Below this the panel cannot sit beside the column without squeezing it
 * past the point where the course's figures and equations still fit, so it
 * becomes a sheet instead. */
export const DOCK_MIN_VIEWPORT = 1360;

/** The reading column at its full width, plus room for a scrollbar. The dock
 * opens at whatever is left over, so the column does not move at all on a
 * first open. Dragging past this narrows the column, down to COLUMN_FLOOR. */
export const COLUMN_FULL = 935;

/** The narrowest the column may be dragged to: the widest thing in the
 * measure set (a card at 646px plus its padding and its 3px accent rule) plus
 * the article's own gutters. Below this the cards start to clip. */
export const COLUMN_FLOOR = 752;

export const DOCK_MIN = 380;

export type DockState = "closed" | "dock" | "sheet";
export type RunKind = "tests" | "scratch";

export interface UpstreamBlame {
	section: SectionDef;
	failing: number;
	total: number;
	firstMessage: string;
}

export interface WorkbenchApi {
	dockState: DockState;
	/** The section the Run buttons are pointed at. */
	current: string | null;
	open(sectionId?: string): void;
	close(): void;
	/** Show a section in the editor, opening the panel if it is shut. */
	reveal(sectionId: string): void;
	sendToScratch(code: string): void;
	runTests(sectionId?: string): void;
	busy: RunKind | null;
	resultFor(sectionId: string): TestRunResult | undefined;
	/** Bumped whenever the document changes, so cards can re-read section state
	 * without subscribing to the document themselves. */
	revision: number;
}

const WorkbenchContext = createContext<WorkbenchApi | null>(null);

export function useWorkbench(): WorkbenchApi {
	const api = useContext(WorkbenchContext);
	if (!api) throw new Error("useWorkbench outside the provider");
	return api;
}

function initialDockState(): DockState {
	if (typeof window === "undefined") return "closed";
	if (!loadUiFlag("dock")) return "closed";
	return window.innerWidth >= DOCK_MIN_VIEWPORT ? "dock" : "closed";
}

/** How wide the dock may be at this viewport, and where it starts. */
export function dockBounds(viewport: number) {
	const max = Math.max(DOCK_MIN, viewport - COLUMN_FLOOR);
	const preferred = Math.max(DOCK_MIN, viewport - COLUMN_FULL);
	return { min: DOCK_MIN, max, preferred: Math.min(preferred, max) };
}

export function WorkbenchProvider({ children }: { children: ReactNode }) {
	const [dockState, setDockState] = useState<DockState>(initialDockState);
	const [current, setCurrent] = useState<string | null>(() => {
		const stored = loadUi("section");
		return stored && SECTION_BY_ID.has(stored) ? stored : null;
	});
	const [revision, setRevision] = useState(0);
	const [busy, setBusy] = useState<RunKind | null>(null);
	const [status, setStatus] = useState("");
	const [output, setOutput] = useState<string[]>([]);
	const [trimmed, setTrimmed] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [cancelled, setCancelled] = useState(false);
	const [ranOnce, setRanOnce] = useState(false);
	const [scratchError, setScratchError] = useState<ScratchRunResult["error"]>(null);
	const [results, setResults] = useState<Record<string, TestRunResult>>({});
	const [stale, setStale] = useState<Record<string, boolean>>({});
	const [lent, setLent] = useState<string[] | null>(null);
	const [blame, setBlame] = useState<UpstreamBlame | null>(null);
	const [blaming, setBlaming] = useState(false);
	const [editorReady, setEditorReady] = useState(false);
	/** Which section the last finished run was for. The output belongs to a run,
	 * and a run belongs to a section, so it says which. */
	const [ranFor, setRanFor] = useState<string | null>(null);
	/** Where the panel should scroll to next. Consumed by the panel, then
	 * cleared, so a second click on the same chip scrolls again. */
	const [revealRequest, setRevealRequest] = useState<{ id: string; at: number } | null>(null);
	/** Bumped when a prompt sends a snippet across, so the panel can open the
	 * scratch pad and scroll to it. Sending code somewhere the reader cannot see
	 * is the same as not sending it. */
	const [scratchRequest, setScratchRequest] = useState(0);

	const bumpRevision = useCallback(() => setRevision((r) => r + 1), []);

	// A run executes the whole file, so any document change makes every result
	// from that file historical. Each finished run has an entry in `stale`;
	// marking those entries here keeps the visible verdict in step with the
	// persistent body-hash state shown by the section picker.
	const invalidateResults = useCallback(() => {
		setStale((prev) => Object.fromEntries(Object.keys(prev).map((id) => [id, true])));
	}, []);

	const documentChanged = useCallback(() => {
		invalidateResults();
		bumpRevision();
	}, [bumpRevision, invalidateResults]);

	// A run reports on the section it was started for, not on wherever the
	// caret has wandered to since.
	const runningFor = useRef<string | null>(null);

	const setDock = useCallback((next: DockState) => {
		setDockState(next);
		saveUiFlag("dock", next !== "closed");
	}, []);

	/** The section to point at when the panel is opened from the edge tab, which
	 * says nothing about which one is wanted. The last one worked on, else the
	 * first one in the file, else the first of the course. Never nothing: with
	 * no section chosen Run tests is disabled, which is a poor thing to hand
	 * somebody who has just opened the panel. */
	const defaultSection = useCallback((): string => {
		const stored = loadUi("section");
		if (stored && SECTION_BY_ID.has(stored)) return stored;
		const present = currentDoc().sections.find((s) => s.def?.kind === "exercise");
		return present?.id ?? SECTION_ORDER[0];
	}, []);

	const open = useCallback(
		(sectionId?: string) => {
			const target = sectionId ?? current ?? defaultSection();
			ensureSection(target);
			setCurrent(target);
			saveUi("section", target);
			setRevealRequest({ id: target, at: Date.now() });
			bumpRevision();
			setDock(window.innerWidth >= DOCK_MIN_VIEWPORT ? "dock" : "sheet");
		},
		[bumpRevision, current, defaultSection, setDock],
	);

	const close = useCallback(() => setDock("closed"), [setDock]);

	const reveal = useCallback(
		(sectionId: string) => {
			ensureSection(sectionId);
			setCurrent(sectionId);
			saveUi("section", sectionId);
			setRevealRequest({ id: sectionId, at: Date.now() });
			bumpRevision();
			if (dockState === "closed") open();
		},
		[bumpRevision, dockState, open],
	);

	// A viewport that crosses the threshold changes what "open" means. Nothing
	// is closed by a resize: a reader who opened the panel keeps it.
	useEffect(() => {
		const onResize = () => {
			setDockState((state) => {
				if (state === "closed") return state;
				return window.innerWidth >= DOCK_MIN_VIEWPORT ? "dock" : "sheet";
			});
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	// The sheet is modal and the dock is not, which is the whole point of the
	// dock. Only the sheet locks the page behind it.
	useEffect(() => {
		if (dockState !== "sheet") return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") close();
		};
		window.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [dockState, close]);

	const beginRun = (kind: RunKind) => {
		setBusy(kind);
		setRanOnce(true);
		setError(null);
		setCancelled(false);
		setScratchError(null);
		setBlame(null);
		setOutput([]);
		setTrimmed(false);
		setStatus("Starting...");
	};

	const collectCommon = (msg: WorkerResponse): boolean => {
		switch (msg.type) {
			case "status":
				setStatus(msg.text);
				return true;
			case "log":
				if (msg.source === "stdout")
					setOutput((prev) => {
						if (prev.length >= 200) setTrimmed(true);
						return [...prev.slice(-199), msg.text];
					});
				return true;
			case "cancelled":
				setCancelled(true);
				setBusy(null);
				setBlaming(false);
				setStatus("");
				return true;
			case "error":
				setError(msg.message);
				setBusy(null);
				setBlaming(false);
				setStatus("");
				return true;
			default:
				return false;
		}
	};

	/** Run one upstream section's own suite, quietly, to see whether it is the
	 * real cause. Used only after a failure, so the happy path pays nothing. */
	const runUpstreamSuite = useCallback(
		(section: SectionDef): Promise<TestRunResult | null> =>
			new Promise((resolve) => {
				const exercise = loadExercise(section.id);
				if (!exercise) {
					resolve(null);
					return;
				}
				exercise.then((ex) => {
					sendRequest(
						{
							type: "runDocument",
							document: loadDocument(),
							testsCode: ex.tests,
							spec: runSpec(section.id),
						},
						(msg: WorkerResponse) => {
							if (msg.type === "testsDone") resolve(msg.result);
							else if (msg.type === "error" || msg.type === "cancelled") resolve(null);
						},
					);
				});
			}),
		[],
	);

	/** Which earlier section is actually broken, if any.
	 *
	 * An AssertionError carries no line number, so a subtly wrong upstream
	 * function cannot be located from the failure itself. Running the upstream
	 * suites can locate it: the earliest one that fails is the culprit, and it
	 * always fails when it is (a wrong sigmoid fails the sigmoid suite too).
	 */
	const findBlame = useCallback(
		async (target: string) => {
			const candidates = upstreamOf(target)
				.reverse()
				.filter((s) => s.kind === "exercise" && sectionPresent(s.id) && !isUntouched(s.id));
			if (!candidates.length) return;
			setBlaming(true);
			for (const section of candidates) {
				const result = await runUpstreamSuite(section);
				if (!result) break;
				const failing = result.tests.filter((t) => !t.passed);
				if (result.setup_error || failing.length) {
					setBlame({
						section,
						failing: failing.length,
						total: result.tests.length,
						firstMessage: result.setup_error?.message ?? failing[0]?.message ?? "",
					});
					break;
				}
			}
			setBlaming(false);
		},
		[runUpstreamSuite],
	);

	const runTests = useCallback(
		(sectionId?: string) => {
			const target = sectionId ?? current;
			if (!target || !SECTION_BY_ID.get(target)) return;
			ensureSection(target);
			setCurrent(target);
			saveUi("section", target);
			runningFor.current = target;
			beginRun("tests");
			setStale((prev) => ({ ...prev, [target]: true }));
			const exercise = loadExercise(target);
			if (!exercise) {
				setBusy(null);
				return;
			}
			exercise.then((ex) => {
				sendRequest(
					{
						type: "runDocument",
						document: loadDocument(),
						testsCode: ex.tests,
						spec: runSpec(target),
						dataUrl: ex.dataUrl,
					},
					(msg: WorkerResponse) => {
						if (collectCommon(msg)) return;
						if (msg.type !== "testsDone") return;
						setResults((prev) => ({ ...prev, [target]: msg.result }));
						setRanFor(SECTION_BY_ID.get(target)?.label ?? null);
						setStale((prev) => ({ ...prev, [target]: false }));
						setLent(msg.result.lent ?? []);
						setBusy(null);
						setStatus("");
						if (msg.result.passed) {
							saveCompleted(target);
							markPassed(target);
							bumpRevision();
						} else {
							emitProgress();
							void findBlame(target);
						}
					},
				);
			});
		},
		[bumpRevision, current, findBlame],
	);

	const runScratch = useCallback(() => {
		const target = current ?? SECTION_ORDER[0];
		beginRun("scratch");
		// A whole-file lend list, not the caret section's: see scratchSpec.
		const spec = scratchSpec(target);
		// The corpus, always. Every prompt's experiment opens with
		// load_corpus(), and the scratch pad belongs to no exercise: reading
		// the dataset off whichever section the caret sits in is how a
		// snippet sent from chapter 1 dies with FileNotFoundError.
		sendRequest(
			{
				type: "runDocumentScratch",
				document: loadDocument(),
				scratchCode: loadScratch(),
				spec,
				dataUrl: CORPUS_URL,
			},
			(msg: WorkerResponse) => {
				if (collectCommon(msg)) return;
				if (msg.type !== "pythonDone") return;
				const result = msg.result as ScratchRunResult;
				setRanFor("your code and the scratch pad");
				setScratchError(result.error);
				setLent(result.lent ?? []);
				setBusy(null);
				setStatus("");
			},
		);
	}, [current]);

	const sendToScratch = useCallback(
		(code: string) => {
			const existing = loadScratch().replace(/\s+$/, "");
			saveScratch(existing ? `${existing}\n\n\n${code}\n` : `${code}\n`);
			bumpRevision();
			setScratchRequest((n) => n + 1);
			if (dockState === "closed") open();
		},
		[bumpRevision, dockState, open],
	);

	/** Follow the caret from section to section, so Run tests always means the
	 * piece being looked at. A caret above the first marker keeps the last one. */
	const onCaret = useCallback((pos: number) => {
		const doc = currentDoc();
		const section = doc.sections.find((s) => pos >= s.from && pos < s.to);
		if (!section || !section.def) return;
		setCurrent((prev) => {
			if (prev === section.id) return prev;
			saveUi("section", section.id);
			return section.id;
		});
	}, []);

	const setDocument = useCallback(
		(text: string) => {
			saveDocument(text);
			documentChanged();
		},
		[documentChanged],
	);

	const resultFor = useCallback((id: string) => results[id], [results]);

	const api = useMemo<WorkbenchApi>(
		() => ({
			dockState,
			current,
			open,
			close,
			reveal,
			sendToScratch,
			runTests,
			busy,
			resultFor,
			revision,
		}),
		[dockState, current, open, close, reveal, sendToScratch, runTests, busy, resultFor, revision],
	);

	return (
		<WorkbenchContext.Provider value={api}>
			{children}
			<Workbench
				dockState={dockState}
				current={current}
				revision={revision}
				busy={busy}
				status={status}
				output={output}
				trimmed={trimmed}
				error={error}
				cancelled={cancelled}
				ranOnce={ranOnce}
				scratchError={scratchError}
				result={current ? results[current] : undefined}
				stale={current ? !!stale[current] : false}
				lent={lent}
				blame={blame}
				blaming={blaming}
				editorReady={editorReady}
				ranFor={ranFor}
				revealRequest={revealRequest}
				scratchRequest={scratchRequest}
				onEditorReady={setEditorReady}
				onDocumentChange={setDocument}
				onScratchChange={saveScratch}
				onCaret={onCaret}
				onSelectSection={reveal}
				onRunTests={(id) => runTests(id)}
				onRunScratch={runScratch}
				onStop={terminateWorker}
				onClose={close}
				onChanged={documentChanged}
			/>
		</WorkbenchContext.Provider>
	);
}
