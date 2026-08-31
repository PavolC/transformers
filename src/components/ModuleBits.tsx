import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

// Shared building blocks for chapter pages (conventions in CLAUDE.md):
// opener with "What you'll be able to do after this", figures with
// captions, and a closing recap with a "go deeper" link to that chapter's
// canonical source (the design doc's section 2 table).

/**
 * The module's opening promise. A disclosure rather than a plain card, open
 * everywhere except on a phone, where three items run to between 250 and 390px
 * and the lesson starts below the fold: on Module 8 at 390x844 the card alone
 * was 46 percent of the first screenful. Folded, the module still opens by
 * naming what it will teach, and the items are one tap away.
 *
 * The state is read once at mount rather than watched, because a reader who has
 * opened the card should not have it closed again by a rotation.
 */
export function AfterThis({ items }: { items: string[] }) {
  const [open] = useState(
    () => !window.matchMedia("(max-width: 560px)").matches,
  );
  return (
    <details className="after-this" open={open}>
      <summary>What you'll be able to do after this</summary>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

/** An anchored section heading inside a module; the floating table of
 * contents discovers these and tracks which one the reader is in. Ids must
 * be unique across modules (prefix with the module: "m4-blame"). */
export function SectionHeader({ id, title }: { id: string; title: string }) {
  return (
    <h3 id={id} className="module-section-title">
      {title}
    </h3>
  );
}

/** Floating on-this-page navigation. Render once per module, anywhere inside
 * the module's article: it discovers that article's SectionHeaders from the
 * DOM, fixes itself to the right gutter on wide screens (hidden where there
 * is no gutter), and highlights the section currently in view. Modules stay
 * mounted but hidden on tab switches, which also hides their toc. */
export function ModuleToc() {
  const ref = useRef<HTMLElement>(null);
  const [sections, setSections] = useState<{ id: string; title: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const article = ref.current?.closest("article");
    if (!article) return;
    const headers = Array.from(
      article.querySelectorAll<HTMLHeadingElement>(".module-section-title"),
    );
    setSections(headers.map((h) => ({ id: h.id, title: h.textContent ?? "" })));
    const measure = () => {
      let current: string | null = null;
      for (const h of headers) {
        if (h.offsetParent === null) continue; // module hidden by tab switch
        if (h.getBoundingClientRect().top <= 140) current = h.id;
      }
      setActive(current);
    };
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("hashchange", measure);
    // A scroll is not the only thing that carries a heading past the line, and
    // this course moves them constantly: panels mount as they come near the
    // viewport, an interactive grows when its chart or its log appears, the
    // opener folds, a late web font re-wraps the tab strip. Every one of those
    // moves the headings below it with no scroll event to recompute on, and
    // until the reader happens to scroll again the toc names the section they
    // have already left. Reported from a 1500px window on Module 7: one section
    // behind, with the next heading in view at the top of the screen.
    //
    // The article covers what changes size inside the module, the body the
    // chrome above it, which moves the module without changing its own height.
    // Both are cheap: a ResizeObserver delivers at most one callback per frame,
    // and it delivers it after layout, so these read settled positions. The
    // measurement itself is one rect read per section and a state update that
    // is almost always a no-op, so nothing here is throttled: a frame callback
    // would buy nothing and would freeze the toc in a renderer that never
    // paints.
    const resized = new ResizeObserver(measure);
    resized.observe(article);
    resized.observe(document.body);
    measure();
    return () => {
      resized.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("hashchange", measure);
    };
  }, []);

  // Scrolling alone leaves a keyboard reader's focus behind in the nav, so the
  // arrow keys keep scrolling the list instead of the section they just chose.
  //
  // The jump is instant rather than smooth, and that is a correctness fix, not
  // a preference. A browser's smooth scroll animates toward the offset it
  // computed when it started, and these pages mount their panels as they come
  // into view: measured on a 390px screen, the document grew 971px while the
  // animation was in flight and the heading ended up 189px above the viewport,
  // repeatably, so the reader arrived mid-paragraph with no sign of the section
  // they asked for. The same jump at 1440px landed exactly, which is why this
  // survived until a phone pass. An instant scroll lands on the mark and stays
  // there, because everything that mounts afterwards is below it. Nothing is
  // lost: every section in this course is thousands of pixels from the next, so
  // the animation was a blur with nothing readable in it.
  const goTo = (id: string) => {
    const heading = document.getElementById(id);
    if (!heading) return;
    heading.scrollIntoView({ block: "start" });
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    setOpen(false);
  };

  const activeTitle =
    sections.find((s) => s.id === active)?.title ?? sections[0]?.title ?? "";

  return (
    <>
      {/* Narrow screens have no gutter for the floating toc, and the module
          nav in the header has long scrolled away by the time it is wanted. */}
      <nav className="module-jump" aria-label="Jump to a section">
        <button
          className="module-jump-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="module-jump-where">Section</span>
          <span className="module-jump-title">{activeTitle}</span>
          <span className="module-jump-caret" aria-hidden="true">
            {open ? "▲" : "▼"}
          </span>
        </button>
        {open && (
          <ul className="module-jump-list">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  className={`module-toc-item ${active === s.id ? "module-toc-active" : ""}`}
                  aria-current={active === s.id ? "true" : undefined}
                  onClick={() => goTo(s.id)}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
      <nav ref={ref} className="module-toc" aria-label="On this page">
        <p className="module-toc-label">On this page</p>
        <ul>
          {sections.map((s) => (
            <li key={s.id}>
              <button
                className={`module-toc-item ${active === s.id ? "module-toc-active" : ""}`}
                aria-current={active === s.id ? "true" : undefined}
                onClick={() => goTo(s.id)}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

/** A quick departure from the lesson (an analogy, a scope note, a why-
 * digression), visually set off so the reader knows the main thread pauses
 * here and resumes after the box. */
export function Aside({ children }: { children: ReactNode }) {
  return (
    <aside className="module-aside">
      <p className="module-aside-label">An aside</p>
      {children}
    </aside>
  );
}

/* A figure's viewBox, with its width handed to CSS as --fig-units.
   Every figure width in the stylesheet is derived from this, so a rule never
   repeats a number that lives in the markup and the two cannot drift apart.
   Keep the viewBox tight to the ink: whitespace inside it is whitespace the
   figure reserves in the column, and on a narrow screen it is whitespace the
   reader has to scroll past. */
export function fig(x: number, y: number, w: number, h: number) {
  return {
    viewBox: `${x} ${y} ${w} ${h}`,
    style: { "--fig-units": w } as CSSProperties,
  };
}

export function Figure({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <figure className="module-figure">
      {/* Wide diagrams keep a readable size on small screens and scroll
          sideways inside this wrapper instead of shrinking to illegibility.
          scroll-x supplies the overflow plus the edge fade that says there is
          more; tabIndex lets a keyboard reach the scroll. */}
      <div className="figure-scroll scroll-x" tabIndex={0}>
        {children}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function Recap({
  items,
  deeper,
  href,
}: {
  items: string[];
  /** The go-deeper sentence's link text: "Shannon (1951), Prediction and
   * Entropy of Printed English". The canonical source per chapter is fixed
   * in the design doc's section 2 table. */
  deeper: string;
  href: string;
}) {
  return (
    <div className="recap">
      <h3>Recap</h3>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      <p className="go-deeper">
        Go deeper: <a href={href}>{deeper}</a> covers this chapter's ground with more
        depth and history.
      </p>
    </div>
  );
}
