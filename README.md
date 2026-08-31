# Transformers

An interactive course in the [Moving Parts](https://pavolc.github.io/moving-parts/)
series: build-it-yourself courses. This one teaches transformers by making you build
one: you write real Python in the page, one part per chapter (the counting model, the
vocabulary, the loss, softmax, embeddings, attention with its causal mask, the
transformer block, the training loop), and finish by training your own character-level
GPT on Shakespeare, live in the browser tab, until it writes.

Everything runs client-side: Python via a pinned Pyodide in a web worker, NumPy only,
no installs, no accounts, no backend. Your code and progress stay in your browser and
can be exported as a file.

## Run it

```
npm ci
npm run dev        # serves on http://localhost:5175
npm run build      # typecheck + static build into dist/
```

The corpus is committed; `python3 tools/fetch_shakespeare.py` regenerates it with a
verified hash. The feasibility spike that sized the in-tab model, with its measurements
and how to re-run them, is in `tools/spike/README.md`.

## How this course is built

`CLAUDE.md` carries the working conventions, `METHOD.md` the process,
`CASEBOOK.md` the incidents behind the rules, `BRAND.md` the series' visual system, and
`transformers-design-doc.md` the plan this course is being built against. The course
kit these started from lives in the series repository.

## License and attribution

Code is MIT; prose and figures are CC BY 4.0; see `LICENSE`. The training corpus is
Tiny Shakespeare: Shakespeare's public-domain text in the concatenated form circulated
by [Andrej Karpathy's char-rnn](https://github.com/karpathy/char-rnn) repository
(provenance and hash in `tools/fetch_shakespeare.py`). The reference implementation is
differential-tested against [nanoGPT](https://github.com/karpathy/nanoGPT) (MIT); see
`THIRD_PARTY_NOTICES.md`. Nothing in this repository carries a NonCommercial term.
