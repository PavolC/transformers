import { useEffect, useRef } from "react";
import { basicSetup, EditorView } from "codemirror";
import {
  Decoration,
  GutterMarker,
  gutter,
  keymap,
  type DecorationSet,
} from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { python } from "@codemirror/lang-python";
import { EditorState, Prec, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { tags } from "@lezer/highlight";

/* The editor's own look, which used to be CodeMirror's stock light theme:
   the one surface in the course nobody had chosen. Everything below is a
   brand token, so the editor moves with the page and a sibling course that
   changes its accent gets a matching editor without touching this file.

   Only chrome here. The token colours are the highlight style below. */
const chrome = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--surface-card)",
      color: "var(--ink)",
      fontSize: "0.85rem",
    },
    ".cm-content": {
      fontFamily: "var(--font-mono)",
      caretColor: "var(--accent)",
      padding: "0.6rem 0",
    },
    ".cm-gutters": {
      backgroundColor: "var(--surface-sunken)",
      color: "var(--muted)",
      border: "none",
      borderRight: "1px solid var(--rule)",
      fontFamily: "var(--font-mono)",
    },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 0.55rem 0 0.9rem" },
    // Every wash painted on a line is an alpha tint, never --accent-wash or
    // --accent-panel. Those two mix with the page ground, so they are opaque,
    // and CodeMirror draws the selection in a layer BEHIND the content: an
    // opaque line background hides it completely. The section highlight below
    // covers the whole section the reader is working in, so that was the
    // selection invisible everywhere it matters.
    ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--accent) 6%, transparent)" },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--accent-wash)",
      color: "var(--ink)",
    },
    "&.cm-focused .cm-cursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
    // Both spellings: the focused editor uses ::selection, the unfocused one
    // paints its own layer, and leaving either out means a selection that
    // vanishes the moment the reader clicks the Run button. The focused rule
    // spells out the whole child chain because CodeMirror's own is
    // "&light.cm-focused > .cm-scroller > .cm-selectionLayer
    // .cm-selectionBackground", and a shorter selector loses to it: the
    // selection came out in CodeMirror's default lavender rather than the
    // course's accent.
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, & > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "color-mix(in srgb, var(--accent) 22%, transparent)",
      },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)",
      outline: "none",
    },
    // The section the Run buttons are pointed at, marked the way a section
    // title is marked elsewhere in the course: a short accent rule.
    ".cm-line.cm-section-here": {
      backgroundColor: "color-mix(in srgb, var(--accent) 6%, transparent)",
      boxShadow: "inset 3px 0 0 var(--accent)",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--surface-sunken)",
      border: "1px solid var(--rule)",
      color: "var(--muted)",
    },
  },
  { dark: false },
);

/* The token colours, taken from the brand's accent family rather than picked.
   Every hue in that family sits at one OKLCH lightness chosen so it clears
   6:1 against the page ground, which is what makes this palette legible by
   construction instead of by eye. Comments are the page's muted ink, so they
   recede the way a comment should. */
const highlight = HighlightStyle.define([
  { tag: tags.comment, color: "var(--muted)", fontStyle: "italic" },
  { tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword], color: "var(--hue-violet)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--hue-moss)" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: "var(--hue-oxide)" },
  { tag: [tags.definition(tags.variableName), tags.function(tags.variableName)], color: "var(--hue-blue)" },
  { tag: [tags.className, tags.typeName], color: "var(--hue-teal)" },
  { tag: tags.operator, color: "var(--hue-plum)" },
  { tag: tags.self, color: "var(--hue-violet)", fontStyle: "italic" },
  { tag: tags.invalid, color: "var(--loss)" },
]);

/** A run marker beside every section line, which is the one notebook idiom
 * that fits here: the control for "run this piece" belongs next to the piece,
 * not in a toolbar the reader has to travel to. The document is still one
 * file, so pressing it runs that section's tests against the whole file. */
class RunMarker extends GutterMarker {
  constructor(private readonly onRun: () => void) {
    super();
  }
  toDOM() {
    const button = document.createElement("button");
    button.className = "cm-run-section";
    button.type = "button";
    button.textContent = "\u25b6";
    button.title = "Run this section's tests";
    button.setAttribute("aria-label", "Run this section's tests");
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", (e) => {
      e.preventDefault();
      this.onRun();
    });
    return button;
  }
}

export interface CodeEditorHandle {
  getDoc(): string;
  /** Replace the whole document. Builds a fresh state rather than dispatching
   * a change, so the undo history goes with it: one Mod-Z after a switch used
   * to paste the previous document back in whole. */
  setDoc(doc: string): void;
  /** Scroll a range into view and put the caret at its start. */
  reveal(from: number, to: number): void;
  /** Highlight the lines of the section the Run buttons are pointed at. */
  markSection(from: number, to: number): void;
  focus(): void;
  /** Remeasure after the panel has been shown or resized: a CodeMirror that
   * was laid out inside a hidden box has stale geometry. */
  remeasure(): void;
}

/** Which character range is the current section, as editor state, so the
 * decoration survives every document change without a React render. */
const setSectionRange = StateEffect.define<{ from: number; to: number }>();

const sectionMark = Decoration.line({ class: "cm-section-here" });

const sectionField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(marks, tr) {
    let range: { from: number; to: number } | null = null;
    for (const effect of tr.effects) if (effect.is(setSectionRange)) range = effect.value;
    if (range === null) return marks.map(tr.changes);
    const doc = tr.state.doc;
    const from = Math.max(0, Math.min(range.from, doc.length));
    const to = Math.max(from, Math.min(range.to, doc.length));
    const builder = new RangeSetBuilder<Decoration>();
    for (let pos = from; pos <= to; ) {
      const line = doc.lineAt(pos);
      builder.add(line.from, line.from, sectionMark);
      if (line.to >= to) break;
      pos = line.to + 1;
    }
    return builder.finish();
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Thin CodeMirror 6 wrapper. Uncontrolled: the editor owns its document;
// the parent reads/writes through the handle and gets onChange callbacks.
export function CodeEditor({
  initialDoc,
  onChange,
  handleRef,
  onReady,
  onSelection,
  onRun,
  runMarkerLines,
  className,
}: {
  initialDoc: string;
  onChange: (doc: string) => void;
  handleRef: React.MutableRefObject<CodeEditorHandle | null>;
  /** Called once the view exists and the handle is usable. The parent loads
   * this component lazily, so until then there is no document to run. */
  onReady?: (ready: boolean) => void;
  /** Where the caret is, so the panel can follow it from section to section. */
  onSelection?: (pos: number) => void;
  /** Mod-Enter runs the tests, Shift-Enter runs the code: the notebook keys. */
  onRun?: (kind: "tests" | "scratch", sectionId?: string) => void;
  /** 1-based lines carrying a section marker, each with the id to run. */
  runMarkerLines?: () => { line: number; id: string }[];
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onSelectionRef = useRef(onSelection);
  onSelectionRef.current = onSelection;
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;
  const markerLinesRef = useRef(runMarkerLines);
  markerLinesRef.current = runMarkerLines;

  useEffect(() => {
    // Named, because setDoc rebuilds the whole state to drop the undo history
    // and has to hand the same extensions back.
    const extensions = [
      basicSetup,
      // After basicSetup, and at raised precedence: basicSetup ships
      // CodeMirror's own highlight style, and the facet applies the first
      // matching rule it finds rather than the last one added.
      chrome,
      Prec.high(syntaxHighlighting(highlight)),
      python(),
      indentUnit.of("    "), // Python convention: 4 spaces
      sectionField,
      ...(runMarkerLines
        ? [
            gutter({
              class: "cm-run-gutter",
              lineMarker: (view, block) => {
                const line = view.state.doc.lineAt(block.from).number;
                const hit = markerLinesRef.current?.().find((m) => m.line === line);
                if (!hit) return null;
                return new RunMarker(() => onRunRef.current?.("tests", hit.id));
              },
              initialSpacer: () => new RunMarker(() => {}),
            }),
          ]
        : []),
      // The panel is narrower than a page-width editor ever was, so a long
      // line has to wrap rather than scroll sideways: a horizontal scrollbar
      // inside a docked column is the one thing that would make reading and
      // coding at once worse than not.
      EditorView.lineWrapping,
      // Tab indents (Shift-Tab dedents). CodeMirror leaves this off by
      // default for keyboard accessibility; Escape then Tab moves focus.
      keymap.of([indentWithTab]),
      // The two run chords are the notebook ones, because that is what anybody
      // who has used one will reach for. At the highest precedence: basicSetup
      // comes first in this array and its default keymap binds Mod-Enter to
      // "insert a blank line", which swallowed it silently.
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            preventDefault: true,
            run: () => {
              onRunRef.current?.("tests");
              return true;
            },
          },
          {
            key: "Shift-Enter",
            preventDefault: true,
            run: () => {
              onRunRef.current?.("scratch");
              return true;
            },
          },
        ]),
      ),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        if (update.selectionSet || update.docChanged) {
          onSelectionRef.current?.(update.state.selection.main.head);
        }
      }),
    ];
    const view = new EditorView({ doc: initialDoc, parent: hostRef.current!, extensions });
    handleRef.current = {
      getDoc: () => view.state.doc.toString(),
      setDoc: (doc: string) => {
        if (doc === view.state.doc.toString()) return;
        view.setState(EditorState.create({ doc, extensions }));
      },
      reveal: (from: number, to: number) => {
        const length = view.state.doc.length;
        const start = Math.max(0, Math.min(from, length));
        const end = Math.max(start, Math.min(to, length));
        view.dispatch({
          selection: { anchor: start },
          effects: EditorView.scrollIntoView(start, { y: "start", yMargin: 24 }),
        });
        view.dispatch({ effects: setSectionRange.of({ from: start, to: end }) });
      },
      markSection: (from: number, to: number) => {
        view.dispatch({ effects: setSectionRange.of({ from, to }) });
      },
      focus: () => view.focus(),
      remeasure: () => view.requestMeasure(),
    };
    onReadyRef.current?.(true);
    return () => {
      handleRef.current = null;
      onReadyRef.current?.(false);
      view.destroy();
    };
    // Mount once; initialDoc changes after mount are applied via the handle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className={className ?? "code-editor"} ref={hostRef} />;
}
