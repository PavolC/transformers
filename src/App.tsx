// The course shell, day-one form: the front door only. The chapter registry,
// the tabbed navigation and the workbench arrive with the exercise pipeline;
// what is fixed already is what a first-time visitor sees (a CLAUDE.md
// decision): the masthead with the tagline, a two-sentence what-this-is, the
// series' four steps, and the footer with the licence and credits. The
// chapter list renders from the registry once the registry exists, never
// from a second hand-maintained copy.

import { Masthead } from "./brand/Masthead";
import { SeriesFooter } from "./brand/SeriesFooter";

export default function App() {
  return (
    <div className="app-shell">
      <Masthead />
      <main className="start-page">
        <section className="start-what">
          <p>
            This course teaches transformers by making you build one. You write real Python
            in the page, one part per chapter, and finish by training your own character-level
            GPT on Shakespeare, live in the tab, until it writes.
          </p>
        </section>
        <section className="start-how">
          <h2>How a course works</h2>
          <ol>
            <li>Read a little: the explanation needed for the next move.</li>
            <li>Manipulate the mechanism: change inputs and inspect what each part does.</li>
            <li>Build part of it: recreate a meaningful piece in the form that suits the system.</li>
            <li>
              Assemble the real thing: put the pieces together into something recognizably
              related to the system itself, not just an analogy.
            </li>
          </ol>
        </section>
      </main>
      <SeriesFooter>
        <p>
          Prose and figures CC BY 4.0, code MIT (see LICENSE). The training corpus is Tiny
          Shakespeare, public-domain text via Andrej Karpathy's char-rnn repository. The
          reference implementation is checked against nanoGPT (MIT).
        </p>
      </SeriesFooter>
    </div>
  );
}
