// What an exercise looks like in the module page now that the editor lives in
// the panel: the prompt, the runnable snippets, and a button that opens the
// section.
//
// The split is by what the thing is for. The prompt is course prose and is
// read; it stays in the reading column at the measure, because several hundred
// words at panel width beside prose at 646px is the "three widths read as an
// accident" failure. The hints and the test code are reference material for
// while you are coding, so they moved into the panel, beside the code they
// describe.
//
// Nothing is re-parented. The prompt paragraphs stay direct children of
// .exercise, so the stylesheet's measure rules keep matching them and nine
// exercises do not silently widen from the prose measure to the full column.

import { useEffect, useState } from "react";
import type { Exercise } from "../exercises/types";
import { subscribeProgress } from "../state/progress";
import { sectionState } from "../state/workbench";
import { SECTION_BY_ID } from "../state/workbenchDoc";
import { useWorkbench } from "./WorkbenchProvider";

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const wb = useWorkbench();
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeProgress(() => setTick((t) => t + 1)), []);

  // wb.revision moves when the document does, tick when a pass mark does.
  const state = sectionState(exercise.id);
  void tick;
  void wb.revision;

  const def = SECTION_BY_ID.get(exercise.id);
  const result = wb.resultFor(exercise.id);
  const isOpen = wb.current === exercise.id && wb.dockState !== "closed";

  const summary =
    state === "passing"
      ? "passing"
      : state === "stale"
        ? "passed, changed since"
        : result
          ? `${result.tests.filter((t) => t.passed).length} of ${result.tests.length} tests passing`
          : state === "missing"
            ? "not started"
            : "written, not passing yet";

  return (
    <section className="exercise">
      <h4 className="exercise-title">
        <span>Exercise: {exercise.title}</span>
        {state === "passing" && (
          <span className="badge-done" title="All tests passed">
            passed
          </span>
        )}
      </h4>

      {exercise.prompt.map((part, i) =>
        typeof part === "string" ? (
          <p key={i}>{part}</p>
        ) : (
          <PlaySnippet key={i} code={part.code} onSend={() => wb.sendToScratch(part.code)} />
        ),
      )}

      <p className="exercise-launcher">
        <button className="exercise-launcher-open" onClick={() => wb.reveal(exercise.id)}>
          {isOpen ? "Show this section in the workbench" : "Open this section in the workbench"}
        </button>
        <span className="exercise-launcher-state">
          {def ? `${def.label}: ${summary}` : summary}
        </span>
      </p>

    </section>
  );
}

function PlaySnippet({ code, onSend }: { code: string; onSend: () => void }) {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="play-snippet">
      <pre>{code}</pre>
      <div className="play-snippet-buttons">
        <button className="button-secondary" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            onSend();
            setSent(true);
            window.setTimeout(() => setSent(false), 1500);
          }}
        >
          {sent ? "Sent" : "Send to the scratch pad"}
        </button>
      </div>
    </div>
  );
}
