import katex from "katex";
import "katex/dist/katex.min.css";

// KaTeX wrappers. Per the content rules (CLAUDE.md), every displayed
// equation gets a one-sentence plain-language gloss immediately after it.

function render(tex: string, displayMode: boolean): { __html: string } {
  return { __html: katex.renderToString(tex, { displayMode, throwOnError: false }) };
}

export function Eq({ tex, gloss }: { tex: string; gloss: string }) {
  return (
    <div className="eq">
      {/* Only the equation scrolls. The gloss stays put: when the whole block
          scrolled, reading the right-hand end of a wide equation on a phone
          carried its explanation off the screen. tabIndex makes the scroller
          keyboard-operable, which an overflow container is not by default. */}
      <div
        className="eq-scroll scroll-x"
        tabIndex={0}
        dangerouslySetInnerHTML={render(tex, true)}
      />
      <p className="eq-gloss">{gloss}</p>
    </div>
  );
}

export function M({ tex }: { tex: string }) {
  return <span dangerouslySetInnerHTML={render(tex, false)} />;
}
