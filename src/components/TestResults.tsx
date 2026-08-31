// What a run reports. Shared between the panel and nothing else so far, but
// kept apart from it because it is the one piece of the workbench that is
// pure presentation of a result.

import type { TestRunResult } from "../runtime/messages";
import { SECTION_BY_ID } from "../state/workbenchDoc";

/** Failures that stopped for the same reason, collected under one card. The
 * untouched skeleton fails every test with the identical NotImplementedError,
 * which used to render as six full-size copies of one sentence. */
function groupFailures(tests: TestRunResult["tests"]) {
  const groups: { message: string; titles: string[]; section?: string | null }[] = [];
  for (const t of tests) {
    if (t.passed) continue;
    const existing = groups.find((g) => g.message === t.message);
    if (existing) existing.titles.push(t.title);
    else groups.push({ message: t.message, titles: [t.title], section: t.section });
  }
  return groups;
}

export function TestResults({
  result,
  flagship,
  stale,
  onGoToSection,
}: {
  result: TestRunResult;
  flagship?: { test: string; note: string };
  stale: boolean;
  onGoToSection?: (id: string) => void;
}) {
  if (result.setup_error) {
    const { message, line, section } = result.setup_error;
    const def = section ? SECTION_BY_ID.get(section) : undefined;
    return (
      <div className={stale ? "test-results test-results-stale" : "test-results"}>
        <div className="test-result test-fail">
          <span className="test-mark" aria-hidden="true">
            ✗
          </span>
          <div>
            <strong>Your file did not run</strong>
            <p>
              {message}
              {line !== null && ` (line ${line})`}. Fix this before the tests can start.
            </p>
            {def && onGoToSection && (
              <button className="button-secondary wb-goto" onClick={() => onGoToSection(def.id)}>
                Go to {def.label}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  const passed = result.tests.filter((t) => t.passed);
  const passedCount = passed.length;
  const failures = groupFailures(result.tests);
  const nothingWritten =
    failures.length > 0 &&
    passedCount === 0 &&
    failures.every((g) => g.message.includes("NotImplementedError"));
  const flagshipPassed = flagship && result.tests.some((t) => t.name === flagship.test && t.passed);
  return (
    <div className={stale ? "test-results test-results-stale" : "test-results"}>
      {stale && (
        <p className="test-stale-note">
          From an earlier run. Press Run tests to check the code as it stands now.
        </p>
      )}
      <p className={result.passed ? "test-summary test-summary-pass" : "test-summary"}>
        {result.passed
          ? "All tests passed."
          : `${passedCount} of ${result.tests.length} tests passed.`}
      </p>
      {nothingWritten && (
        <p className="test-orient">
          Nothing is implemented yet, so every test stopped at the first function it called. Work
          down the list below: the earlier functions are the ones the later tests need.
        </p>
      )}
      {flagshipPassed && <p className="flagship-banner">{flagship.note}</p>}
      {failures.map((g) => {
        const def = g.section ? SECTION_BY_ID.get(g.section) : undefined;
        return (
          <div key={g.message} className="test-result test-fail">
            <span className="test-mark" aria-hidden="true">
              ✗
            </span>
            <div>
              <strong>
                <span className="sr-only">Failed: </span>
                {g.titles[0]}
              </strong>
              {g.titles.length > 1 && (
                <p className="test-also">
                  and {g.titles.length - 1} more for the same reason: {g.titles.slice(1).join("; ")}
                </p>
              )}
              <p>{g.message}</p>
              {def && onGoToSection && (
                <button className="button-secondary wb-goto" onClick={() => onGoToSection(def.id)}>
                  Go to {def.label}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {passed.length > 0 && (
        /* Folded. A passing check is a receipt, not a finding: six of them at
           full size pushed the failures and the output most of a screen down,
           and the reader who wants to know which six is one press away. The
           summary line carries the count, which is the part that is read. */
        <details className="test-passed">
          <summary>
            <span className="test-mark" aria-hidden="true">
              ✓
            </span>{" "}
            {passed.length} {passed.length === 1 ? "check" : "checks"} passed
          </summary>
          <ul>
            {passed.map((t) => (
              <li key={t.name}>
                <span className="sr-only">Passed: </span>
                {t.title}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
