import { useEffect, useRef, useState } from "react";
import { CHAPTERS } from "../chapters";
import { EXERCISES } from "../exercises/registry";
import {
  exportProgress,
  importProgress,
  loadCompleted,
  resetAll,
  resetExercise,
  subscribeProgress,
} from "../state/progress";
import { downloadText, sectionState, SECTIONS } from "../state/workbench";
import downloadNotice from "../python/download_notice.txt?raw";

// The course's front door, and the only page that talks about the course
// rather than about transformers: what it is, how the machinery works, what
// every chapter covers, and what this browser has stored. Reachable at
// #start, which is where a bare link lands. The chapter outline renders from
// the chapter registry, never from a second hand-maintained list.

/** How each section of the file reads in the list below. */
const STATE_WORDS = {
  missing: "not in your file yet",
  written: "written, not passing yet",
  passing: "passing",
  stale: "passed, changed since",
} as const;

export function StartPage({ onGoTo }: { onGoTo: (id: string) => void }) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeProgress(() => setTick((t) => t + 1)), []);

  const [note, setNote] = useState<string | null>(null);
  const [noteError, setNoteError] = useState(false);
  const say = (text: string, isError = false) => {
    setNote(text);
    setNoteError(isError);
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const passed = EXERCISES.filter((e) => loadCompleted(e.id));

  const download = () => {
    const blob = new Blob([exportProgress()], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "transformers-progress.json";
    link.click();
    URL.revokeObjectURL(link.href);
    say("Saved. Keep the file anywhere; load it here or in another browser.");
  };

  const downloadLibrary = () => {
    const blob = new Blob([downloadText(downloadNotice)], { type: "text/x-python" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "scribe.py";
    link.click();
    URL.revokeObjectURL(link.href);
    say("Downloaded. scribe.py runs anywhere NumPy is installed.");
  };

  const load = (file: File) => {
    file
      .text()
      .then((text) => {
        const report = importProgress(text);
        say(
          report.shape === "merged"
            ? `Loaded: ${report.merged.length} section(s) replaced from the file, the rest left alone. One Undo in the workbench brings the old file back.`
            : "Loaded.",
        );
      })
      .catch((err: unknown) => {
        say(err instanceof Error ? err.message : String(err), true);
      });
  };

  const forgetAll = () => {
    if (
      window.confirm(
        "Forget everything? Your file, your hints and your passed marks are cleared from this browser. A progress file you saved earlier still loads afterwards.",
      )
    ) {
      resetAll();
      say("Forgotten. The file starts fresh.");
    }
  };

  return (
    <article className="start">
      <p className="start-lede">
        This course teaches transformers by making you build one. You write real Python in
        the page, one part per chapter, and finish by training your own character-level
        GPT on Shakespeare, live in this tab, until it writes. By the end you hold one
        file, <code>scribe.py</code>, that you wrote and can explain matrix by matrix.
      </p>

      <h3 id="start-series">How a course works</h3>
      <ol className="start-steps">
        <li>Read a little: the explanation needed for the next move.</li>
        <li>Manipulate the mechanism: change inputs and inspect what each part does.</li>
        <li>Build part of it: recreate a meaningful piece in the form that suits the system.</li>
        <li>
          Assemble the real thing: put the pieces together into something recognizably
          related to the system itself, not just an analogy.
        </li>
      </ol>

      <h3 id="start-how">How the machinery works</h3>
      <ul className="start-facts">
        <li>
          <b>Python really runs here.</b> An in-page editor sends your code to CPython 3.14
          compiled to WebAssembly (Pyodide), with NumPy, in a Web Worker so a training run
          never freezes the page. The first run downloads about 15 MB of runtime and the
          browser caches it after that.
        </li>
        <li>
          <b>Nothing to install, and nothing to sign up for.</b> There is no server and no
          account. Your code and your progress never leave this browser, and the only
          things coming down are this page, the runtime and the Shakespeare the course
          trains on.
        </li>
        <li>
          <b>Your work lives in this browser.</b> Your file, the hints you have opened and
          the sections that have passed are stored in this browser's local storage, per
          browser and per device. The progress section below is how you move or clear
          them.
        </li>
        <li>
          <b>Nothing is locked.</b> Every chapter is open from the tabs at any time, in any
          order. A section you have not written yet is filled in from the course's copy
          for a run, and the panel names what it borrowed; once you have written it, yours
          is what runs.
        </li>
        <li>
          <b>Each exercise shows its work.</b> The tests are readable in the page, hints
          come in stages that you choose to open, and the reference solution is the last
          of them. When a run fails, the panel says whether the cause is the section you
          are looking at or one further up your file, and names it.
        </li>
      </ul>

      {/* Counted from the registry rather than written out, so the heading
          cannot claim a number the list does not contain. The design doc
          plans twelve chapters; this list is the ones that exist. */}
      <h3 id="start-chapters">
        {CHAPTERS.length} of the 12 planned chapters {CHAPTERS.length === 1 ? "is" : "are"} up
      </h3>
      <ol className="start-outline">
        {CHAPTERS.map((chapter) => {
          const here = EXERCISES.filter((e) => e.module === chapter.id);
          return (
            <li key={chapter.id}>
              <button className="start-outline-title" onClick={() => onGoTo(chapter.id)}>
                {chapter.navLabel.replace(" · ", ". ")}
              </button>
              <p>{chapter.covers}</p>
              {here.length > 0 && (
                <p className="start-outline-writes">
                  You write:{" "}
                  {here.map((e, k) => (
                    <span key={e.id}>
                      {k > 0 && ", "}
                      <code>{e.builds.split(":")[0]}</code>
                      {loadCompleted(e.id) && <span className="start-tick"> passed</span>}
                    </span>
                  ))}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <h3 id="start-progress">Your file, and what this browser has stored</h3>
      <p>
        Everything you write in this course goes into one Python file, a section per
        exercise, in the order you meet them. {passed.length} of {EXERCISES.length}{" "}
        {EXERCISES.length === 1 ? "section is" : "sections are"} passing here.{" "}
        {passed.length === 0
          ? "Nothing is saved yet."
          : "Resetting one puts back its starting text and clears its hints and its passed mark; the rest of the file is untouched."}
      </p>
      <ul className="start-progress">
        {SECTIONS.map((section) => {
          const state = sectionState(section.id);
          const exercise = EXERCISES.find((e) => e.id === section.id);
          return (
            <li key={section.id} className={state === "passing" ? "start-done" : ""}>
              <span className="start-progress-mark" aria-hidden="true">
                {state === "passing" ? "✓" : state === "stale" ? "!" : state === "missing" ? "·" : "○"}
              </span>
              <span className="start-progress-name">
                <button className="start-progress-link" onClick={() => onGoTo(section.module)}>
                  {section.label}
                </button>{" "}
                <span className="start-progress-where">
                  {section.kind === "given"
                    ? state === "missing"
                      ? "not in your file yet"
                      : "in your file"
                    : STATE_WORDS[state]}
                </span>
                <span className="start-progress-builds">
                  {exercise ? exercise.builds : section.provides.join(", ")}
                </span>
                {state === "stale" && (
                  <span className="start-progress-warn">
                    Passed once, and the text has changed since. Run its tests again to know
                    where it stands.
                  </span>
                )}
              </span>
              {section.kind === "exercise" && (
                <button
                  className="button-secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Reset "${section.label}"? That section of your file goes back to its starting text, and its hints and passed mark are cleared. The rest of the file is untouched, and one Undo in the workbench brings it back.`,
                      )
                    ) {
                      const outcome = resetExercise(section.id);
                      say(outcome.ok ? `Reset ${section.label}.` : (outcome.reason ?? "Nothing was reset."), !outcome.ok);
                    }
                  }}
                >
                  Reset
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="start-storage">
        <button className="button-secondary" onClick={downloadLibrary}>
          Download my scribe.py
        </button>
        <button className="button-secondary" onClick={download}>
          Save my progress to a file
        </button>
        <button className="button-secondary" onClick={() => fileRef.current?.click()}>
          Load progress from a file
        </button>
        <button className="button-secondary" onClick={forgetAll}>
          Forget everything
        </button>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(ev) => {
            const file = ev.target.files?.[0];
            ev.target.value = ""; // so the same file can be picked twice
            if (file) load(file);
          }}
        />
      </div>
      <p className={`status-fixed ${noteError ? "demo-status-error" : "demo-status"}`} role="status">
        {note ?? ""}
      </p>
      <p className="start-storage-note">
        A saved file holds your whole scribe.py, which hints you opened, and which sections
        passed. Loading one replaces the sections it names and leaves the rest alone.
        Downloading scribe.py is a different thing: that is the Python itself, ready to run
        anywhere NumPy is installed, and it is not a file this page can load back.
      </p>
    </article>
  );
}
