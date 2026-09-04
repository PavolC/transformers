// Two 65 by 65 tables of probabilities side by side, painted as grids: the
// counted tally and the learned one, on one colour scale, so the reader can
// see that training arrives at the same picture counting drew.
//
// Grid family (CLAUDE.md, figure geometry): fixed cell size, colour from the
// accent scale. At 65 cells a row the numbers cannot go in the cells, so a
// hover reads the cell out instead, and on a narrow screen the pair keeps its
// size and pans inside its scroll wrapper. The cells are painted on a canvas
// rather than as 4,225 SVG rectangles apiece, because the trainer repaints
// the learned table every hundred steps.
//
// Nothing here is quoted in prose: the static figure hands in bench tables,
// the panel hands in its own, and the prose reads the bench.

import { useEffect, useRef, useState } from "react";
import { charLabel } from "./utils";

/** CSS pixels per cell. 65 cells at 4.5px is 292.5px a grid, so two grids
 * and their gap sit inside the 646px column without panning. */
export const HEAT_CELL = 4.5;

export interface HeatTable {
  title: string;
  /** (V, V) probabilities, row = the character just read. Null paints an
   * empty grid (the learned table before training starts). */
  probs: number[][] | null;
}

function parseColor(css: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(css.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The accent and the page ground, read from the stylesheet so the canvas
 * uses the same two inks the SVG figures mix. */
function inks(el: HTMLElement): { accent: [number, number, number]; ground: [number, number, number] } {
  const cs = getComputedStyle(el);
  return {
    accent: parseColor(cs.getPropertyValue("--accent")) ?? [75, 88, 148],
    ground: parseColor(cs.getPropertyValue("--surface")) ?? [253, 253, 251],
  };
}

/** A probability's share of the accent. The square root lifts the middling
 * probabilities most filled cells hold into a visible tint, and 1 lands at
 * the same 62 percent the tally grid's fullest cell uses, so both grid figures
 * read on one scale. There is no floor: a learned table has no exact zeros,
 * and a floor painted every one of its 4,225 cells the same faint grey, which
 * hid the picture the figure exists to show. */
function mixFor(p: number): number {
  if (p <= 0) return 0;
  return 0.62 * Math.sqrt(Math.min(1, p));
}

function paint(canvas: HTMLCanvasElement, probs: number[][] | null, V: number) {
  const dpr = window.devicePixelRatio || 1;
  const size = Math.round(V * HEAT_CELL);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const { accent, ground } = inks(canvas);
  ctx.fillStyle = `rgb(${ground.join(",")})`;
  ctx.fillRect(0, 0, size, size);
  if (!probs) return;
  for (let r = 0; r < V; r++) {
    const row = probs[r];
    for (let c = 0; c < V; c++) {
      const m = mixFor(row[c]);
      if (m === 0) continue;
      const rgb = accent.map((a, i) => Math.round(ground[i] + (a - ground[i]) * m));
      ctx.fillStyle = `rgb(${rgb.join(",")})`;
      ctx.fillRect(c * HEAT_CELL, r * HEAT_CELL, HEAT_CELL, HEAT_CELL);
    }
  }
}

function HeatCanvas({
  table,
  V,
  onCell,
}: {
  table: HeatTable;
  V: number;
  onCell: (r: number, c: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paint(ref.current, table.probs, V);
  }, [table.probs, V]);
  return (
    <canvas
      ref={ref}
      className="heat-canvas"
      role="img"
      aria-label={`${table.title}: a ${V} by ${V} grid, one row per character just read, one column per character that might follow, darker where the probability is higher.`}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const c = Math.floor((e.clientX - rect.left) / HEAT_CELL);
        const r = Math.floor((e.clientY - rect.top) / HEAT_CELL);
        if (r >= 0 && r < V && c >= 0 && c < V) onCell(r, c);
      }}
    />
  );
}

export function HeatPair({
  chars,
  left,
  right,
  idleText,
}: {
  chars: string[];
  left: HeatTable;
  right: HeatTable;
  /** What the readout says before the reader has hovered a cell. */
  idleText: string;
}) {
  const V = chars.length;
  const [cell, setCell] = useState<[number, number] | null>(null);
  const read = (t: HeatTable, r: number, c: number) =>
    t.probs ? t.probs[r][c].toFixed(4) : "not yet";
  return (
    <div className="heat-figure">
      <div className="table-scroll scroll-x" tabIndex={0}>
        <div className="heat-pair">
          {[left, right].map((t) => (
            <div className="heat-panel" key={t.title}>
              <p className="heat-title">{t.title}</p>
              <HeatCanvas table={t} V={V} onCell={(r, c) => setCell([r, c])} />
            </div>
          ))}
        </div>
      </div>
      <p className="heat-readout" role="status">
        {cell
          ? `Row ${charLabel(chars[cell[0]])}, column ${charLabel(chars[cell[1]])}: ${left.title} ${read(left, cell[0], cell[1])}, ${right.title} ${read(right, cell[0], cell[1])}.`
          : idleText}
      </p>
    </div>
  );
}
