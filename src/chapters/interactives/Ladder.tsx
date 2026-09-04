// The ladder: the one figure of bits per character every chapter adds a rung
// to. Plot family (CLAUDE.md): natural scale, capped at its drawn width and
// centred, shrinking on a phone rather than panning.
//
// It renders whatever rung list it is handed. Each chapter's bench emits the
// full list up to itself, recomputed in the same engine, so the numbers on
// one drawing never come from two benches (CLAUDE.md, Decisions).

interface Rung {
  id: string;
  label: string;
  bits: number;
}

const W = 520;
const H = 250;
const TOP = 28; // y of the highest bit value
const BOTTOM = 218; // y of 0 bits
const MAX_BITS = 7;
const AXIS_X = 206;
const RUNG_END = 436;
const LABEL_GAP = 15;

function y(bits: number) {
  return BOTTOM - (Math.min(bits, MAX_BITS) / MAX_BITS) * (BOTTOM - TOP);
}

export function Ladder({ rungs }: { rungs: Rung[] }) {
  // Labels sit at their rung's height, pushed apart where two rungs are
  // within a line of each other, so chapter 4's rung at almost the same
  // height as the counted tally's stays legible. The values on the right
  // follow the same rows: two rungs 0.03 bits apart printed their values on
  // top of each other when each value sat on its own line.
  const sorted = [...rungs].sort((a, b) => b.bits - a.bits);
  const labelY: number[] = [];
  for (const r of sorted) {
    let ly = y(r.bits);
    const prev = labelY[labelY.length - 1];
    if (prev !== undefined && ly - prev < LABEL_GAP) ly = prev + LABEL_GAP;
    labelY.push(ly);
  }
  const ticks = Array.from({ length: MAX_BITS + 1 }, (_, i) => i);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="c3-ladder"
      role="img"
      aria-label={
        "The ladder: bits per character on held-back text, one rung per model. " +
        sorted.map((r) => `${r.label}, ${r.bits.toFixed(2)} bits`).join("; ") +
        "."
      }
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={AXIS_X} x2={RUNG_END} y1={y(t)} y2={y(t)} className="chart-grid" />
          <text x={AXIS_X - 8} y={y(t) + 4} textAnchor="end" className="chart-tick">
            {t}
          </text>
        </g>
      ))}
      <line x1={AXIS_X} x2={AXIS_X} y1={TOP} y2={BOTTOM} className="ladder-axis" />
      <text
        x={AXIS_X - 8}
        y={TOP - 12}
        textAnchor="end"
        className="chart-axis-label"
      >
        bits per character
      </text>
      {sorted.map((r, i) => (
        <g key={r.id}>
          <line x1={AXIS_X} x2={RUNG_END} y1={y(r.bits)} y2={y(r.bits)} className="ladder-rung" />
          <text
            x={AXIS_X + 10}
            y={labelY[i] - 5}
            className="ladder-rung-label"
          >
            {r.label}
          </text>
          <text x={RUNG_END + 8} y={labelY[i] - 1} className="ladder-rung-value">
            {r.bits.toFixed(2)}
          </text>
        </g>
      ))}
    </svg>
  );
}
