import { Suspense, useEffect, useRef, useState } from "react";
import { Masthead } from "./brand/Masthead";
import { SeriesFooter } from "./brand/SeriesFooter";
import { DockHandle, DockShell } from "./components/DockShell";
import { WorkbenchProvider, useWorkbench } from "./components/WorkbenchProvider";
import { StartPage } from "./start/StartPage";
import { CHAPTERS } from "./chapters";
import { ensureLibrary } from "./state/progress";

const START_TAB = "start";

// The learner's file is built out of whatever this browser already holds
// before anything renders, so no component ever sees a half-migrated state.
ensureLibrary();

export default function App() {
  return (
    <WorkbenchProvider>
      <AppShell />
    </WorkbenchProvider>
  );
}

// The active tab lives in the URL hash (#start, #c4) so a reload or a shared
// link lands on the same page. Every chapter is always reachable; a bare link
// and an unknown hash both land on the start page, which is where a reader who
// has not seen the course before needs to arrive.
function tabFromHash(): string {
  const id = window.location.hash.slice(1);
  return CHAPTERS.some((c) => c.id === id) ? id : START_TAB;
}

function AppShell() {
  const workbench = useWorkbench();
  const [tab, setTab] = useState<string>(tabFromHash);
  // Which chapters have been opened. Chapters load on demand, but once one is
  // rendered it stays rendered, so its editor and visualization state survives
  // every later tab switch.
  const [opened, setOpened] = useState<Set<string>>(() => new Set([tabFromHash()]));
  const selectTab = (id: string) => {
    window.location.hash = id;
    setTab(id);
  };
  useEffect(() => {
    setOpened((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  }, [tab]);

  // Warm the remaining chapter chunks once the page is quiet, so deferring
  // them costs a download on first paint and nothing on navigation.
  useEffect(() => {
    const warm = () => CHAPTERS.forEach((c) => c.preload?.());
    const idle = window.requestIdleCallback;
    if (idle) {
      const id = idle(warm);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // An unknown hash resolves to the start page; rewrite it so the URL never
  // claims to be somewhere the reader is not.
  useEffect(() => {
    if (window.location.hash.slice(1) !== tab) window.location.hash = tab;
  }, [tab]);

  // Chapters are stacked in one document and hidden rather than unmounted, so
  // without this a tab switch keeps the previous chapter's scroll offset and
  // the browser clamps it into the new one. Start every chapter at its top.
  // The tab strip is one panning row on narrow screens, so the active tab can
  // sit off-screen; centre it when the tab changes.
  const tabStrip = useRef<HTMLElement>(null);
  useEffect(() => {
    const active = tabStrip.current?.querySelector<HTMLElement>(".tab-active");
    active?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [tab]);

  // Both navigations read the same list: the strip that wraps on a wide
  // screen, and the picker that replaces it below the fold width.
  const navItems = [
    { id: START_TAB, label: "Start" },
    ...CHAPTERS.map((c) => ({ id: c.id, label: c.navLabel })),
  ];
  const current = navItems.find((n) => n.id === tab) ?? navItems[0];
  const [navOpen, setNavOpen] = useState(false);
  // A chapter switch from the picker closes it; one from anywhere else (the
  // Continue button, a deep link) leaves it as it was, which is closed.
  useEffect(() => setNavOpen(false), [tab]);

  const panels = useRef<Record<string, HTMLDivElement | null>>({});
  // The tab this effect last acted on. A boolean "have I mounted yet" flag
  // does not survive StrictMode, which runs the effect, cleans up, and runs it
  // again; comparing tab values is idempotent.
  const actedOn = useRef(tab);

  useEffect(() => {
    // First render, or a re-run for a tab we already handled: leave the page
    // alone. A deep link should not fight the browser's own restoration.
    if (actedOn.current === tab) return;
    actedOn.current = tab;
    window.scrollTo(0, 0);
    // Rescue focus only when the switch is what took it away: is the focused
    // element inside a subtree we just hid? (See course one's App for the two
    // wrong ways to ask this.)
    const active = document.activeElement as HTMLElement | null;
    const lostFocus =
      !!active &&
      active !== document.body &&
      (!active.isConnected || active.closest("[hidden]") !== null);
    if (!lostFocus) return;
    const heading = panels.current[tab]?.querySelector<HTMLElement>("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [tab]);

  return (
    <>
      <DockShell dockState={workbench.dockState}>
        <Masthead
          compact={tab !== START_TAB}
          nav={
            <>
              <nav className="tabs" ref={tabStrip} aria-label="Course chapters">
                {navItems.map((n) => (
                  <button
                    key={n.id}
                    className={`tab ${tab === n.id ? "tab-active" : ""}`}
                    aria-current={tab === n.id ? "page" : undefined}
                    onClick={() => selectTab(n.id)}
                  >
                    {n.label}
                  </button>
                ))}
              </nav>
              {/* Below the fold width the strip cannot show every tab without
                  panning, and dragging a row sideways is the worst way to
                  offer a list. The same list, folded: one line that names
                  where you are and opens the rest vertically. Only one of the
                  two is ever displayed, so a screen reader is not read the
                  course twice. */}
              <nav className="module-picker" aria-label="Course chapters">
                <button
                  className="module-picker-toggle"
                  aria-expanded={navOpen}
                  onClick={() => setNavOpen((o) => !o)}
                >
                  <span className="module-picker-where">Chapter</span>
                  <span className="module-picker-title">{current.label}</span>
                  <span className="module-picker-caret" aria-hidden="true">
                    {navOpen ? "▲" : "▼"}
                  </span>
                </button>
                {navOpen && (
                  <ul className="module-picker-list">
                    {navItems.map((n) => (
                      <li key={n.id}>
                        <button
                          className={`module-picker-item ${tab === n.id ? "module-picker-current" : ""}`}
                          aria-current={tab === n.id ? "page" : undefined}
                          onClick={() => selectTab(n.id)}
                        >
                          {n.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </nav>
            </>
          }
        />
        <main>
          <div
            hidden={tab !== START_TAB}
            ref={(el) => {
              panels.current[START_TAB] = el;
            }}
          >
            <StartPage onGoTo={selectTab} />
          </div>
          {/* A chapter renders on first visit and stays rendered after that,
              so tab switches never lose editor or visualization state. */}
          {CHAPTERS.map((c, i) => {
            const next = CHAPTERS[i + 1];
            return (
              <div
                key={c.id}
                hidden={tab !== c.id}
                ref={(el) => {
                  panels.current[c.id] = el;
                }}
              >
                <Suspense fallback={<p className="module-loading">Loading {c.navLabel}...</p>}>
                  {opened.has(c.id) && <c.Component />}
                </Suspense>
                {next && (
                  <div className="next-module">
                    <button onClick={() => selectTab(next.id)}>
                      Continue to {next.navLabel} →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </main>
        <SeriesFooter>
          <p>
            Built by <a href="https://github.com/PavolC">Pavol Chvala</a>. The course is
            open source at{" "}
            <a href="https://github.com/PavolC/transformers">PavolC/transformers</a>.
          </p>
          <p>
            Prose and figures <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>,
            code MIT: full terms in <a href="./LICENSE.txt">LICENSE</a>. The training corpus is
            Tiny Shakespeare, public-domain text via{" "}
            <a href="https://github.com/karpathy/char-rnn">char-rnn</a>. The reference
            implementation is checked against{" "}
            <a href="https://github.com/karpathy/nanoGPT">nanoGPT</a> (MIT).
          </p>
        </SeriesFooter>
      </DockShell>
      <DockHandle onOpen={() => workbench.open()} />
    </>
  );
}
