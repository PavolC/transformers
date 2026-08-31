// The panel: the learner's whole file, the run controls, and what a run says.
//
// Docked to the right of the reading column above 1360px, so the prose stays
// on screen while they type, and a full-screen sheet below that. Always
// mounted, hidden with CSS, so a tab switch never costs the editor's state
// and one editor serves the whole course.

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadExercise } from "../exercises/loaders";
import type { Exercise } from "../exercises/types";
import type { ScratchRunResult, TestRunResult } from "../runtime/messages";
import downloadNotice from "../python/download_notice.txt?raw";
import { loadRevealStage, resetExercise, saveRevealStage } from "../state/progress";
import {
  canUndo,
  currentDoc,
  downloadText,
  editedGivens,
  loadDocument,
  putSection,
  loadScratch,
  sectionState,
  subscribeDocument,
  undoLastSplice,
  type SectionState,
} from "../state/workbench";
import { SECTIONS, SECTION_BY_ID, lineMap } from "../state/workbenchDoc";
import type { CodeEditorHandle } from "./CodeEditor";
import { TestResults } from "./TestResults";
import type { DockState, RunKind, UpstreamBlame } from "./WorkbenchProvider";

// CodeMirror is the largest dependency in the app, 147 KB gzipped against the
// 155 KB of everything else, and it is needed only once the panel is opened.
// It used to be deferred by an in-view gate on one exercise; a panel has no
// in-view moment, so the first open is the gate instead.
const CodeEditor = lazy(() => import("./CodeEditor").then((m) => ({ default: m.CodeEditor })));

const REVEAL_LABELS = ["Show hint 1", "Show hint 2", "Show the solution"];

interface Props {
  dockState: DockState;
  current: string | null;
  revision: number;
  busy: RunKind | null;
  status: string;
  output: string[];
  trimmed: boolean;
  error: string | null;
  cancelled: boolean;
  ranOnce: boolean;
  scratchError: ScratchRunResult["error"];
  result: TestRunResult | undefined;
  stale: boolean;
  lent: string[] | null;
  blame: UpstreamBlame | null;
  blaming: boolean;
  editorReady: boolean;
  /** The section the last finished run was for, so the output can say. */
  ranFor: string | null;
  revealRequest: { id: string; at: number } | null;
  /** The last snippet a prompt sent to the scratch pad, and where it landed. */
  scratchRequest: { from: number; seq: number } | null;
  onEditorReady(ready: boolean): void;
  onDocumentChange(text: string): void;
  onScratchChange(text: string): void;
  onCaret(pos: number): void;
  onSelectSection(id: string): void;
  onRunTests(sectionId?: string): void;
  onRunScratch(): void;
  onStop(): void;
  onClose(): void;
  onChanged(): void;
}

const STATE_LABEL: Record<SectionState, string> = {
  missing: "not started",
  written: "not passing yet",
  passing: "passing",
  stale: "changed since",
};

export function Workbench(props: Props) {
  const {
    dockState,
    current,
    revision,
    busy,
    status,
    output,
    trimmed,
    error,
    cancelled,
    ranOnce,
    scratchError,
    result,
    stale,
    lent,
    blame,
    blaming,
    editorReady,
    ranFor,
    revealRequest,
    scratchRequest,
  } = props;

  const editorRef = useRef<CodeEditorHandle | null>(null);
  const scratchRef = useRef<CodeEditorHandle | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const [scratchOpen, setScratchOpen] = useState(false);
  const [scratchReady, setScratchReady] = useState(false);
  const scratchDetailsRef = useRef<HTMLDetailsElement>(null);
  /** The last send this panel has actually put in front of the reader. */
  const appliedScratch = useRef(0);
  const sectionsRef = useRef<HTMLDetailsElement>(null);
  const [spliceNote, setSpliceNote] = useState<string | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [reveal, setReveal] = useState(0);
  // The editor chunk is fetched on the first open and never unmounted after.
  const [everOpened, setEverOpened] = useState(dockState !== "closed");

  const open = dockState !== "closed";
  useEffect(() => {
    if (open) setEverOpened(true);
  }, [open]);

  const doc = useMemo(() => currentDoc(), [revision]);
  const def = current ? SECTION_BY_ID.get(current) : undefined;

  // Follow an import or a splice that happened somewhere else. Without this
  // the always-mounted editor keeps the text it had and the next keystroke
  // writes it back over what was just loaded.
  useEffect(
    () =>
      subscribeDocument((source) => {
        if (source === "editor") return;
        editorRef.current?.setDoc(loadDocument());
        props.onChanged();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Scroll to whichever section was asked for, once the editor exists.
  useEffect(() => {
    if (!revealRequest || !editorReady) return;
    const section = currentDoc().byId.get(revealRequest.id);
    if (!section) return;
    editorRef.current?.setDoc(loadDocument());
    editorRef.current?.reveal(section.from, section.to);
  }, [revealRequest, editorReady]);

  // Mark the current section whenever the caret moves it.
  useEffect(() => {
    if (!editorReady || !current) return;
    const section = currentDoc().byId.get(current);
    if (section) editorRef.current?.markSection(section.from, section.to);
  }, [current, editorReady, revision]);

  // A CodeMirror laid out inside a hidden box has stale geometry.
  useEffect(() => {
    if (open) editorRef.current?.remeasure();
  }, [open]);

  // The sheet is modal, so focus goes into it and comes back out again.
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      // Not the editor: landing a keyboard reader inside a text area with no
      // announcement is worse than landing them on the panel's own heading.
      panelRef.current?.querySelector<HTMLElement>(".wb-title")?.focus();
    } else if (returnFocus.current?.isConnected) {
      returnFocus.current.focus();
      returnFocus.current = null;
    }
  }, [open]);

  // A finished run puts its answer at the bottom of a column that can be
  // thousands of pixels long, so bring it into view. Only on a finish, never
  // while typing: nothing else in the panel may move the reader.
  const lastResult = useRef<TestRunResult | undefined>(undefined);
  useEffect(() => {
    if (!result || result === lastResult.current) return;
    lastResult.current = result;
    resultsRef.current?.scrollIntoView({ block: "nearest" });
  }, [result]);

  // A snippet arriving from a prompt opens the scratch pad, puts the appended
  // text into the editor, and brings both into view: the pad sits at the foot
  // of a column that can be thousands of pixels long and shows 180px of code
  // at a time, and code sent somewhere the reader cannot see was not sent.
  //
  // The editor owns its copy of the pad, exactly like the document editor
  // above, so writing storage is not sending: the first send of a session
  // arrived only because it was what opened the pad, every send after it
  // stopped at localStorage, and the next keystroke wrote the editor's stale
  // copy back over it, taking the snippet out of Run the scratch pad too.
  useEffect(() => {
    if (!scratchRequest || scratchRequest.seq === appliedScratch.current) return;
    setScratchOpen(true);
    // No editor yet, because the pad was closed: it mounts with the appended
    // text already in it, and this runs again on its onReady.
    if (!scratchReady) return;
    appliedScratch.current = scratchRequest.seq;
    scratchRef.current?.setDoc(loadScratch());
    const id = window.setTimeout(() => {
      scratchDetailsRef.current?.scrollIntoView({ block: "nearest" });
      scratchRef.current?.revealAt(scratchRequest.from);
    }, 60);
    return () => window.clearTimeout(id);
  }, [scratchRequest, scratchReady]);

  // Follow the tail while a run streams, unless the reader has scrolled up.
  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [output]);

  // The current section's exercise: its flagship banner, its hints, and the
  // test code. A section written for the learner has none of these, so this is
  // null there and the disclosures below do not render.
  useEffect(() => {
    if (!current) {
      setExercise(null);
      return;
    }
    setReveal(loadRevealStage(current));
    const pending = loadExercise(current);
    if (!pending) {
      setExercise(null);
      return;
    }
    let live = true;
    pending.then((ex) => {
      if (live) setExercise(ex);
    });
    return () => {
      live = false;
    };
  }, [current]);

  const revealNext = useCallback(() => {
    if (!current) return;
    const next = Math.min(reveal + 1, 3);
    setReveal(next);
    saveRevealStage(current, next);
  }, [current, reveal]);

  const putSolution = useCallback(() => {
    if (!current || !exercise) return;
    if (
      !window.confirm(
        "Replace this section of your file with the reference solution? One Undo brings back what is there now.",
      )
    )
      return;
    const outcome = putSection(current, exercise.solution);
    if (!outcome.ok && outcome.reason) setSpliceNote(outcome.reason);
    props.onChanged();
  }, [current, exercise, props]);

  const running = busy !== null;
  const canRun = editorReady && !running;

  const download = useCallback(() => {
    const blob = new Blob([downloadText(downloadNotice)], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scribe.py";
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const resetCurrent = useCallback(() => {
    if (!def) return;
    if (
      !window.confirm(
        `Put the ${def.label} section back to how it started? Your text in that section, its hints and its passed mark are lost. The rest of your file is untouched, and one Undo brings it back.`,
      )
    )
      return;
    const result = resetExercise(def.id);
    setSpliceNote(result.ok ? null : (result.reason ?? null));
    props.onChanged();
  }, [def, props]);

  const undo = useCallback(() => {
    if (undoLastSplice()) {
      setSpliceNote(null);
      props.onChanged();
    }
  }, [props]);

  const problems = doc.problems.filter((p) => p.kind !== "out-of-order");
  const notes = doc.problems.filter((p) => p.kind === "out-of-order");
  const touchedGivens = useMemo(() => editedGivens(), [revision]);

  /** The status line under the head. The picker owns the section name now, so
   * this says only what the run is saying, and is empty most of the time. */
  const statusText = error
    ? `Something went wrong: ${error}`
    : cancelled
      ? "Stopped. Press Run tests to try again."
      : blaming
        ? "Checking the sections above this one..."
        : busy
          ? status || "Running..."
          : "";

  const liveMessage = error
    ? `Run failed. ${error}`
    : cancelled
      ? "Stopped."
      : blaming
        ? "Checking the sections above this one."
        : busy
          ? status || "Running..."
          : result && !stale
            ? result.setup_error
              ? "Your file did not run. The reason is above the results."
              : result.passed
                ? "All tests passed."
                : `${result.tests.filter((t) => t.passed).length} of ${result.tests.length} tests passed.`
            : "";

  return (
    <aside
      ref={panelRef}
      className="wb"
      data-dock={dockState}
      hidden={!open}
      aria-label="Your library"
      role={dockState === "sheet" ? "dialog" : undefined}
      aria-modal={dockState === "sheet" ? true : undefined}
      aria-busy={running}
    >
      {/* One row of chrome. The section rail that used to sit under this was
          eleven chips in a row that pans, so at the dock's own width it showed
          four of them: a keyhole onto the course rather than a picture of it.
          The same eleven, with the same state marks, are in the picker below,
          which shows all of them at once and costs no permanent height. */}
      <div className="wb-head">
        <h2 className="wb-title" tabIndex={-1}>
          <span className="sr-only">Your library </span>
          <code>scribe.py</code>
        </h2>
        <button className="wb-run" onClick={() => props.onRunTests()} disabled={!canRun || !current}>
          {busy === "tests" ? "Running..." : "Run tests"}
        </button>
        {running && (
          <button className="button-secondary wb-stop" onClick={props.onStop}>
            Stop
          </button>
        )}
        <details className="wb-sections" ref={sectionsRef}>
          <summary aria-label={`Section: ${def ? def.label : "none chosen"}`}>
            <span className="wb-sections-label">{def ? def.label : "Pick a section"}</span>
          </summary>
          <div className="wb-sections-menu" role="listbox">
            {SECTIONS.map((section) => {
              const state = sectionState(section.id);
              // A given section has no tests, so "not passing yet" would be a
              // lie about it: it says whether it is in the file, and nothing
              // else.
              const given = section.kind === "given";
              return (
                <button
                  key={section.id}
                  role="option"
                  aria-selected={current === section.id}
                  className={`wb-section-item wb-section-${state} ${current === section.id ? "wb-section-current" : ""}`}
                  onClick={() => {
                    if (sectionsRef.current) sectionsRef.current.open = false;
                    props.onSelectSection(section.id);
                  }}
                >
                  <span className="wb-section-mark" aria-hidden="true">
                    {state === "passing" || (given && state !== "missing")
                      ? "✓"
                      : state === "stale"
                        ? "!"
                        : state === "missing"
                          ? "+"
                          : "·"}
                  </span>
                  <span className="wb-section-name">{section.label}</span>
                  <span className="wb-section-state">
                    {given
                      ? state === "missing"
                        ? "not in your file yet"
                        : "in your file"
                      : STATE_LABEL[state]}
                  </span>
                </button>
              );
            })}
          </div>
        </details>
        <details className="wb-more">
          <summary aria-label="More actions">More</summary>
          <div className="wb-more-menu">
            <button className="button-secondary" onClick={download}>
              Download my scribe.py
            </button>
            <button className="button-secondary" onClick={resetCurrent} disabled={!def}>
              Reset this section
            </button>
            <button className="button-secondary" onClick={undo} disabled={!canUndo()}>
              Undo that
            </button>
            <p className="wb-more-tip">
              <b>Run tests</b> runs your whole file and then checks the section named beside it;
              Ctrl or Cmd with Enter does the same, and the triangle beside a section line runs
              that section. The scratch pad at the bottom has its own Run, for trying things and
              printing values; Shift with Enter runs it from anywhere. Tab indents, and Escape
              then Tab moves keyboard focus out. Your file is saved in this browser only.
            </p>
          </div>
        </details>
        <button className="button-secondary wb-close" onClick={props.onClose}>
          Close
        </button>
      </div>

      {/* The run's own line, under the head rather than in it. Six things
          across one row left it about 50px wide, so "Running the tests..."
          rendered as "R...". It is empty except during a run, so at rest the
          chrome is still one row. */}
      {statusText && (
        <p className={error ? "wb-status wb-status-error" : "wb-status"}>{statusText}</p>
      )}

      {(problems.length > 0 || spliceNote || touchedGivens.length > 0) && (
        <div className="wb-repair">
          {problems.map((p) => (
            <p key={`${p.kind}-${p.line}`}>{p.message}</p>
          ))}
          {touchedGivens.map((s) => (
            <p key={s.id}>
              Your {s.label} section has been changed. That stretch was written for you and the
              tests above and below it are pinned to what it does, so a failure there will look
              like a failure in your own code.
            </p>
          ))}
          {spliceNote && <p>{spliceNote}</p>}
          {canUndo() && (
            <button className="button-secondary" onClick={undo}>
              Undo the last change the course made
            </button>
          )}
        </div>
      )}

      {/* One scroll below the chrome: the code, what it printed and the
          verdict flow down a single column the way a page does. */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </p>

      <div className="wb-flow" ref={flowRef}>
        {everOpened ? (
          <Suspense fallback={<EditorPlaceholder />}>
            <CodeEditor
              className="code-editor wb-editor"
              initialDoc={loadDocument()}
              onChange={props.onDocumentChange}
              onSelection={props.onCaret}
              onRun={(kind, id) => (kind === "tests" ? props.onRunTests(id) : props.onRunScratch())}
              // Only the sections with tests of their own: a stretch written
              // for the learner has nothing to run.
              runMarkerLines={() =>
                lineMap(currentDoc())
                  .filter((s) => s.kind === "exercise")
                  .map((s) => ({ line: s.start, id: s.id }))
              }
              handleRef={editorRef}
              onReady={props.onEditorReady}
            />
          </Suspense>
        ) : (
          <EditorPlaceholder />
        )}

        <div className="wb-results" ref={resultsRef}>
          {notes.map((p) => (
            <p key={p.line} className="demo-status">
              {p.message}
            </p>
          ))}

          {/* What the code printed comes first, directly under the code, the
              way a notebook puts a cell's output under the cell. The verdict
              follows it. */}
          {ranOnce && (
            <div className="output-panel wb-output">
              <h5>
                Output{ranFor ? <span className="wb-ran-for"> from {ranFor}</span> : null}
                {/* One scroll means the code is above whatever a run just
                    produced, sometimes thousands of pixels above. This is the
                    way back, and the picker in the head is the way here. */}
                <button className="wb-back" onClick={() => current && props.onSelectSection(current)}>
                  Back to the code
                </button>
              </h5>
              <pre ref={outputRef}>
                {trimmed && "(earlier output trimmed to the last 200 lines)\n"}
                {output.length
                  ? output.join("\n")
                  : running
                    ? "(waiting for output...)"
                    : "(nothing printed; add print(...) anywhere to inspect values)"}
              </pre>
              {scratchError && (
                <p className="demo-status demo-status-error">
                  Your code stopped with {scratchError.message}
                  {scratchError.line !== null && ` (line ${scratchError.line})`}
                  {scratchError.label ? `, in the ${scratchError.label}` : ""}.
                </p>
              )}
            </div>
          )}

          {blame && (
            <div className="wb-blame">
              <strong>Before this section.</strong>
              <p>
                Your {blame.section.label} section is failing {blame.failing} of {blame.total} of
                its own tests, and the tests below call it. Fixing it there is likely to fix these.
              </p>
              {blame.firstMessage && <p className="wb-blame-message">{blame.firstMessage}</p>}
              <button
                className="button-secondary"
                onClick={() => props.onSelectSection(blame.section.id)}
              >
                Go to {blame.section.label}
              </button>
            </div>
          )}

          {result && (
            <TestResults
              result={result}
              flagship={exercise?.flagship}
              stale={stale}
              onGoToSection={props.onSelectSection}
            />
          )}

          {/* Only when something was borrowed. "Run entirely on your own code"
              is the ordinary case, and a line that says nothing happened is
              noise under every passing run. */}
          {lent !== null && lent.length > 0 && !running && (
            <p className="wb-lent">
              Run with the course&apos;s {listNames(lent)}. Your own versions run here once those
              sections are written.
            </p>
          )}

          {exercise && (
            <div className="wb-help">
              <details className="wb-tests">
                <summary>See exactly what the tests check (the test code)</summary>
                <pre>{exercise.tests}</pre>
              </details>

              <div className="wb-hints">
                {reveal > 0 && (
                  <div className="hint">
                    <h5>Hint 1</h5>
                    <p>{exercise.hints[0]}</p>
                  </div>
                )}
                {reveal > 1 && (
                  <div className="hint">
                    <h5>Hint 2</h5>
                    <pre className="hint-pre">{exercise.hints[1]}</pre>
                  </div>
                )}
                {reveal > 2 && (
                  <div className="hint">
                    <h5>Reference solution</h5>
                    <pre className="hint-pre">{exercise.solution}</pre>
                    <button className="button-secondary" onClick={putSolution}>
                      Put this solution in my file
                    </button>
                  </div>
                )}
                {reveal < 3 && (
                  <button className="button-secondary button-hint" onClick={revealNext}>
                    {REVEAL_LABELS[reveal]}
                  </button>
                )}
              </div>
            </div>
          )}

          <details
            className="wb-scratch"
            ref={scratchDetailsRef}
            open={scratchOpen}
            onToggle={(e) => setScratchOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary>Scratch pad</summary>
            <p className="wb-scratch-note">
              Anything here runs after your library, with every name in it available, and is never
              part of it. This is where you try things and print values.
            </p>
            {scratchOpen && (
              <Suspense fallback={<EditorPlaceholder />}>
                <CodeEditor
                  className="code-editor wb-scratch-editor"
                  initialDoc={loadScratch()}
                  onChange={props.onScratchChange}
                  onRun={() => props.onRunScratch()}
                  handleRef={scratchRef}
                  onReady={setScratchReady}
                />
              </Suspense>
            )}
            {scratchOpen && (
              <div className="wb-scratch-controls">
                <button className="button-secondary" onClick={props.onRunScratch} disabled={!canRun}>
                  {busy === "scratch" ? "Running..." : "Run the scratch pad"}
                </button>
                <span className="wb-scratch-hint">or Shift with Enter, from anywhere</span>
              </div>
            )}
          </details>
        </div>
      </div>
    </aside>
  );
}

function listNames(names: string[]): string {
  const code = names.map((n) => `${n}`);
  if (code.length === 1) return code[0];
  return `${code.slice(0, -1).join(", ")} and ${code[code.length - 1]}`;
}

function EditorPlaceholder() {
  return <div className="code-editor code-editor-loading">Loading the editor...</div>;
}
