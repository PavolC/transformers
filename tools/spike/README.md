# M0 feasibility spike: the scribe trains in a browser tab

The riskiest constraint in the design doc, proved end to end on 2026-08-31: a
character-level decoder-only transformer, written in float64 NumPy
(`src/python/reference_scribe.py`), training on Tiny Shakespeare inside a real
Chromium tab under Pyodide, beating the counted bigram's ladder rung inside
the 60-second budget.

## The measurement

Environment: headless Chromium (Playwright) on the build machine, Pyodide
**314.0.5** (Python 3.14.2, NumPy 2.4.6) served from a local copy of the
release distribution. Reader machines differ; the margin below is what absorbs
that.

Fixed reference points, same engine (Pyodide), full corpus (1,115,394 chars,
vocabulary 65, split 90/10):

- uniform guessing: log2(65) = 6.022 bits per character
- counted bigram, add-1 smoothing, scored on the held-out tail: **3.5806 bits**

| config | params | steps/s | tokens/s | crossed the rung | val bits at budget end |
|---|---|---|---|---|---|
| T=32 C=48 H=4 L=2 B=16, lr 2e-3 | 64,481 | 6.2 | 3,173 | **24.5 s** (step 150, val 3.556) | 3.359 at 75 s |
| T=48 C=64 H=4 L=2 B=16, lr 2e-3 | 111,553 | 1.84 | 1,417 | 81.4 s (over budget) | 3.555 at 90 s |
| T=64 C=64 H=4 L=2 B=16, lr 2e-3 | 112,577 | 1.26 | 1,289 | not within 90 s | 3.653 at 90 s |

Boot (Pyodide + NumPy, locally served): 3.7 to 4.3 s. First training tick
lands within 2 s of the run starting. The 75-second sample from the passing
config already carries line structure and capitalized speaker names with
colons ("HACINT:"), which meets the samples half of the budget.

Native CPython on the same machine runs the passing config at 21.5 steps/s,
so the wasm factor is about 3.5x. The CDN cold-load could not be measured
from this build environment (the proxy blocks jsdelivr); the payload it
serves is pyodide.asm.wasm 9.6 MB + stdlib 2.5 MB + numpy wheel 2.9 MB before
transfer compression, the same ballpark course one ships.

## The verdict, and the pin

- **PASS.** The proven envelope for the in-tab training chapters is
  T=32, C=48, H=4, L=2, B=16, lr 2e-3: rung crossed at 24.5 s against a
  60-second budget, a 2.4x margin for slower reader machines.
- **Pyodide is pinned to 314.0.5** (course one's pin, revalidated here). The
  pin lives in `src/runtime/pyodideWorker.ts` and may not move without
  re-running this spike.
- Chapter 10 may tune the config within this envelope (the knobs and the
  fallback path are design-doc section 8, M0); anything outside it re-runs
  the spike first.

## Re-running

1. `python3 tools/spike/native_check.py` — gradient check and overfit sanity
   for the reference implementation (native, correctness only).
2. Serve a directory that contains both this repo and a Pyodide 314.0.5
   distribution (the full release tarball's pyodide.mjs, pyodide.asm.mjs,
   pyodide.asm.wasm, python_stdlib.zip, pyodide-lock.json and the numpy
   wheel are enough), e.g. `python3 -m http.server 8123`.
3. `npm i -D playwright-core`, then
   `CHROMIUM_BIN=<chromium> node tools/spike/measure.mjs --url "http://127.0.0.1:8123/<repo>/tools/spike/index.html?dist=http://127.0.0.1:8123/<pyodide-dist>/&T=32&C=48&H=4&L=2&B=16&lr=0.002&budget=75"`

The page also runs by hand in any browser with the same URL, printing ticks
as it trains.
