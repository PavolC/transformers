# Design doc: Transformers (working title: "Transformers")

Written with Claude in one sitting, before any code, per `METHOD.md` Phase 0. Two
maintenance rules, both inherited from course one:

- **Append, never revise.** When an open question gets answered, annotate it in place
  rather than editing the question away.
- **Section 10 grows as the build runs.** Every deliberate departure from this plan gets
  recorded there, with its reason.

Interview results this doc is built on (2026-08-31): the goal is to train a GPT the
learner built themselves; the floor is "course one, faded" and it passed the two-paragraph
floor test; the source policy is original prose checked against nanoGPT; the shape is 12
chapters with assembly as the summit. The fit test was run before this doc: transformers
pass all five points, and point 2's answer (which parts get built, manipulated, inspected)
is enumerated in section 1.

---

## 1. What this is

The learner builds a character-level GPT in Python, one part at a time, inside a browser
tab: the counting model, the vocabulary, the loss, softmax, embeddings, attention with the
causal mask, multi-head attention, the transformer block, and the training loop. Nothing
installs. Python runs in the page (Pyodide in a worker), every exercise grows one shared
file the learner keeps, and the last two chapters are the learner assembling their own
model and pointing it at text the course never curated.

The finished artifact is **the scribe**: a small decoder-only transformer (size fixed by
the feasibility spike, planning range 100k to 400k parameters) that trains live in the tab
on Tiny Shakespeare, its loss falling on a visible curve while its sampled text improves,
plus the workbench it was built in. The learner leaves able to write a working GPT from a
blank file and able to read nanoGPT as a translation of something they own.

Fit-test point 2, what the learner does to the mechanism, named one by one:

- **Builds:** the pair tally and its sampler; the vocabulary and batch windows; the
  surprise metric (the loss); softmax and fused cross-entropy backward; the embedding
  table with its gradient; a trained bigram; a fixed-window MLP language model; causal
  masked mixing; a single attention head, forward and backward; multi-head attention;
  learned positional embeddings; LayerNorm forward; the transformer block and the stack;
  the AdamW step; `generate()`; the full training loop; vocabulary hardening for foreign
  input.
- **Manipulates:** tally rows, sampling temperature, hand-set mixing weights, the causal
  mask, attention heads in a gallery, position scrambling, training knobs (steps, learning
  rate, context length).
- **Inspects:** attention maps on real sentences, the loss ladder across all models, live
  training curves and samples, a memorization probe on their own corpus.

### Goals, in priority order

1. The primary learner (Pavol) understands transformers deeply by implementing a
   character-level GPT, every table and every gradient, in NumPy.
2. The artifact is self-sufficient: a colleague opens a link and finishes with no book,
   no setup, no author involvement.
3. It is demoable in under two minutes: open link, open the training chapter, press run,
   watch the loss fall and the samples turn Shakespeare-shaped.

### Non-goals

- Not a PyTorch or GPU course. No autograd framework, no CUDA, no `nn.Module`. NumPy only.
- BPE tokenization is not built. It is named, motivated in chapter 12, and pointed at.
- No fine-tuning, RLHF, quantization, KV-cache serving, or inference optimization. The
  assembly chapter's "not taught" list carries these explicitly.
- Not a port of nanoGPT. nanoGPT is the offline reference the parity fixture is generated
  from, not a text being followed.
- Not encoder-decoder. Decoder-only, GPT-shaped, from the first attention chapter.
- No backend, no accounts, no telemetry. A static site; learner code stays in the browser.

## 2. Source, licensing and attribution

**Prose policy:** all explanations original, structured for interactivity. No source text
is being adapted, so no source licence reaches the content. Verbatim borrowing does not
happen; short quotations of papers, if ever used, are cited inline.

**Code policy:** all shipped code is course-authored. The one adaptation is offline:
`tools/fixtures/gen_parity_fixture.py` derives its reference model from nanoGPT
(MIT, © Andrej Karpathy) to generate the committed parity fixture. That file carries the
MIT notice in its header, and `THIRD_PARTY_NOTICES.md` lists it. If any adapted code ever
ships in the build itself, its notice is emitted into the build output and linked from the
footer (course one's shipped defect, not repeated here).

**Licences chosen (the scope lesson from course one, applied):** nothing NonCommercial
touches this repo. Code (engine, runtime, tools, exercises) is MIT. Prose and figures are
CC BY 4.0. The brand layer and tooling remain series assets and carry no course-specific
terms. `LICENSE` states the split.

**Data:** Tiny Shakespeare is public-domain text (Shakespeare), in the concatenated form
circulated by Andrej Karpathy's char-rnn repository. The fetch script records source URL
and sha256. Attribution line in the README and the app footer.

**Attribution surfaces, named:** README (licences, sources, nanoGPT and Tiny Shakespeare
credits), `LICENSE` plus `THIRD_PARTY_NOTICES.md`, and the app footer (© line, "prose
CC BY 4.0, code MIT", data and reference credits).

**Per-chapter go-deeper targets** (chosen now because they fix the chapter order):

| ch | target |
|---|---|
| 1 | Shannon (1951), "Prediction and Entropy of Printed English" |
| 2 | Karpathy, "Let's build the GPT Tokenizer" (video) |
| 3 | Olah, "Visual Information Theory" |
| 4 | Karpathy, "The spelled-out intro to language modeling: building makemore" (video) |
| 5 | Bengio, Ducharme, Vincent, Jauvin (2003), "A Neural Probabilistic Language Model" |
| 6 | Olah and Carter (2016), "Attention and Augmented Recurrent Neural Networks" (Distill) |
| 7 | Vaswani et al. (2017), "Attention Is All You Need" |
| 8 | Alammar, "The Illustrated Transformer" |
| 9 | Radford et al. (2019), "Language Models are Unsupervised Multitask Learners" (GPT-2) |
| 10 | Karpathy, "Let's build GPT: from scratch, in code, spelled out" (video) |
| 11 | the nanoGPT repository itself, read as code |
| 12 | Karpathy (2015), "The Unreasonable Effectiveness of Recurrent Neural Networks" |

## 3. Architecture

- **Frontend:** React + TypeScript + Vite, single-page app with tabbed chapters (course
  one's shell shape: a `ModuleDef` registry, lazy chapters, preloading). Static build,
  deployed to GitHub Pages by Actions, `base: "./"`.
- **In-page runtime:** Pyodide, pinned to one exact version chosen at the spike, plus the
  NumPy build it bundles. The version string lives in one constant in
  `src/runtime/pyodideWorker.ts`, and the pin does not move without re-running the spike.
- **Editor:** CodeMirror 6 with the Python language package, themed from the brand tokens
  (chrome from surfaces and accent, token colours from the accent family).
- **Execution model:** everything Python runs in a web worker. Three protocols:
  `run-tests` (two code strings in, one structured verdict out), `run-code` (the editor's
  code with stdout streamed back, no tests), and `train` (a long-running loop streaming
  `{step, loss_bits, tokens_per_s, sample}` with cancellation). The first two are course
  one's shapes; `train` replaces course one's MNIST protocol.
- **Visualizations:** hand-drawn SVG from the figure families in section 5. No chart
  library: every figure is a teaching object with labelled parts, and the families keep
  the geometry a small closed set.
- **State:** localStorage under a `transformers.` prefix. The workbench document (the one
  growing file), per-exercise pass state, and chapter progress, with JSON export and
  import so a learner can move browsers.

**The two-engines rule, resolved structurally:** benches run under the *pinned Pyodide in
Node*, not native CPython, so every number the prose quotes comes from the same
interpreter, the same NumPy build, and the same code path the reader's tab runs. Native
CPython appears only in the offline fixture generator (which needs torch), and its outputs
are committed literals with a stated tolerance. JS interactives either replay committed
bench JSON (when the prose quotes their numbers) or compute live and have their numbers
never quoted in prose.

### Data

| dataset | what | licence | size | arrives | producer |
|---|---|---|---|---|---|
| `public/data/tinyshakespeare.txt` | concatenated Shakespeare plays, plain text | public domain | ~1.1 MB (planning figure; measured at fetch) | clean, one file | `tools/fetch_shakespeare.py` (records URL + sha256) |
| `src/bench/*.json` | numbers the prose, tables and figures quote | course's own | small | generated | `tools/bench/*` under pinned Pyodide (see section 10) |
| `src/exercises/fixtures/parity.json` | reference logits, loss, gradients for the flagship check | derived from nanoGPT (MIT) | small | committed literal | `tools/fixtures/gen_parity_fixture.py` (offline, torch) |

The raw-data requirement is met by chapter 12: the learner pastes arbitrary text, which is
the uncurated dataset, deliberately not committed.

### The canonical representation

Copied into `CLAUDE.md` on day one. Drift from this is a bug.

- Text is a Python `str`. The corpus is `public/data/tinyshakespeare.txt`, read as UTF-8.
- The vocabulary is `sorted(set(corpus))`. A token is one character. Its id is its index
  in that sorted list. `encode` and `decode` are total over the corpus's own characters
  and are the only crossing point between `str` and arrays.
- Token sequences are NumPy `int64` arrays. A batch of windows has shape `(B, T)`; its
  targets are the same windows shifted one character left, also `(B, T)`.
- Axis law: batch is axis 0, time is axis 1, channels are the last axis. Time reads left
  to right; the past of position `t` is positions `0..t`, self included.
- Floats are `float64`, NumPy's default, everywhere. Chosen so that naive learner code
  (`np.zeros`, fresh arrays) matches the reference bit-for-bit instead of silently
  promoting. Memory is irrelevant at this model size; speed is the spike's job to verify.
- Activations are `(B, T, C)`. Per-head attention weights are `(B, H, T, T)`, lower
  triangular after masking.
- Randomness: one `np.random.default_rng(seed)` created by the caller and passed
  explicitly. No global seeding. Parameter initialization order is registration order and
  is documented per module, because draw order is part of the contract (course one's bench
  incident).
- Parameters live in one flat `dict[str, np.ndarray]` with dotted names
  (`"blocks.0.attn.w_q"`). Gradients mirror it key for key. A module is a pair of pure
  functions, `forward(params, x, cfg) -> (out, cache)` and
  `backward(cache, d_out) -> (grads, d_x)`.
- The loss is mean cross-entropy over every position in the batch, **in bits**
  (base-2 log). Bits are the teaching unit from chapter 3 onward; chapter 11's translation
  table carries the one conversion sentence to the field's nats.
- The countable quantity every chapter reduces: **average surprise per character, in bits,
  on held-out Shakespeare**, tracked on one recurring figure, the ladder.

### Exercise and test contract

**One file the learner grows.** Decided now, with course one's three invariants in force
from the first commit: the untouched file implements nothing (every section raises
`NotImplementedError` or is explicitly marked "written for you"), no section rebinds a
name an earlier section owns, and an unwritten section still lets its chapter run (the
harness lends the course's copy for the run and names what it borrowed). The mutation
check enforces the first invariant's teeth: sabotage a provider (softmax, the attention
head), and every consumer suite must notice.

- Tests import the learner's code as the module `submission`, in definition order,
  failing by raising with a teaching message; each test's display title is its docstring's
  first line.
- Deterministic: fixed seeds passed as explicit rng arguments, fixtures hardcoded as
  literals in the test source, no wall-clock assertions.
- **The seam:** the shared drivers (`train_driver`, `sample_driver`, `eval_driver`) take
  the model as arguments (`forward_fn`, `params`, `generate_fn`), defaulting to the
  earlier chapter's model. Chapter 4 trains the bigram through the same driver chapter 10
  trains the scribe through, so later exercises are one-line diffs on the call, not
  rewrites.
- Backward-pass policy (who writes what): the learner writes backward for fused
  softmax-plus-cross-entropy, the embedding table, the linear layer (restated from course
  one), and the attention head (guided, in stages). The course provides backward for
  LayerNorm and GELU as "written for you" sections, each with an Aside deriving it for the
  curious. Every learner-written backward is tested against a numerical gradient check,
  which chapter 4 rebuilds in their own hands as `grad_check` (course one's flagship,
  restated, now a tool they carry).
- Hint ladder per exercise: prompt (always re-rendered, carries the whole contract),
  then a nudge, then a structural hint, then the visible solution. Test source viewable in
  the page; a run-my-code path executes the editor without tests.

**The flagship automated proof: the parity check.** In chapter 11 the learner's assembled
model is loaded with fixed weights and run on a fixed batch, and its logits, its loss, and
every gradient in the tree must match the committed nanoGPT-derived fixture to within
1e-6 relative. When it passes, the workbench banner celebrates it in plain words: their
NumPy and the field's PyTorch computed the same numbers. Chapter-level numerical gradient
checks feed this; the parity check is the one that gets the banner.

## 4. Chapters

Twelve. The running world is one story: teaching a small machine to write by reading
Shakespeare. Recurring artifacts: the line ("to be, or not to be" and its tally), the
corpus, **the tally** (the counts table that becomes, in turn, probabilities, a learned
table, and finally logits), **the ladder** (the loss figure every chapter adds a rung to),
and **the scribe** (the growing model). The last chapter was checked against this world
before the first: chapter 12 is the same workbench, the same ladder, pointed at pasted
text, so the world carries to the end without re-anchoring.

Titles are working titles. Each chapter: what it covers; interactives; the exercise
(what Pavol writes); go-deeper per the table in section 2.

1. **The next-letter game.** Language modelling as next-character guessing. The pair
   tally built by hand on one line, then on the whole corpus; sampling by proportion;
   feeding outputs back in; what a pair model gets right and what it forgets (everything
   before the last letter). *Interactives:* tally builder on the line (grid family, the
   course's first figure); a letter-wheel sampler generating a live stream from the
   corpus tally. *Exercise:* `count_pairs`, `sample_next`. Sections 1 and 2 of the one
   file.
2. **Tokens and the corpus.** The corpus arrives (size and character count measured on
   the page, not asserted). A token as whatever unit the model reads; ours is one
   character, and why that choice is the honest small case. `encode`/`decode`, ids,
   windows of length T, targets as the shift-by-one, batches `(B, T)`. *Interactives:*
   vocabulary strip (every character the corpus contains, with counts); window slicer
   showing x and y offset by one. *Exercise:* `build_vocab` (encode/decode), `get_batch`.
3. **Measuring surprise.** From tally rows to probabilities. Surprise as minus log2 of
   the probability given to what actually came next; the loss as average surprise per
   character, in bits; the uniform ceiling (log2 of the vocabulary size, derived on the
   page); train/val split so the score is honest. The counted bigram gets the ladder's
   first real rung. *Interactives:* surprise meter reading held-out text one character at
   a time, running average converging; the ladder debuts (plot family). *Exercise:*
   `probs_from_tally`, `surprise_bits`, `avg_surprise`.
4. **The learned tally.** The bigram, rebuilt as a trained model: the embedding table as
   a learnable tally, rows as scores (logits), softmax as the machine that turns scores
   into a guess list, fused cross-entropy and its clean gradient (probabilities minus
   one-hot), the SGD step restated from course one, and `grad_check` rebuilt. Training
   converges to the counted tally's rung, which is the point: learning recovers counting
   when counting is all there is. *Interactives:* softmax playground (scores in, guess
   list out, temperature slider); learned-tally heatmap converging beside the counted one.
   *Exercise:* `softmax`, `cross_entropy` (forward and backward), embedding
   forward/backward, `sgd_step`, `grad_check`, then training through the driver seam.
5. **A wider window.** Context beyond one character: concatenate the embeddings of the
   last K characters, one hidden layer (course one's dense layer, restated), logits.
   Loss drops; the ladder gets its rung. Then the cracks, tallied: parameters grow
   linearly with K, position 3's weights learn nothing from position 7's, and K is a hard
   wall. *Interactives:* window slider with live parameter count; anatomy diagram
   (box-and-arrow family). *Exercise:* `window_forward` / `window_backward` (concat,
   linear, tanh, linear).
6. **Mixing the past.** Attention's idea with no queries or keys yet: each position
   builds its summary as a weighted average of the past's vectors. Hand-set unequal
   weights first, where the mechanism shows (the u after q looking hard at the q);
   uniform averaging explained afterwards as the crude default, not led with. The causal
   mask as the triangle: position t sees 0..t and nothing right of itself. *Interactives:*
   the mixing board (drag weights for one position, watch the blend and its prediction);
   mask reveal on the grid. *Exercise:* `causal_mix(values, weights)` with the mask.
7. **Queries, keys, values.** Weights computed from content: what am I looking for
   (query), what do I offer (key), dot product as match strength, divide by sqrt of head
   size (derived by measuring dot-product spread with and without, bench-fed), softmax
   over the masked row (chapter 4's machine, reused and said so), then the mix from
   chapter 6 applied to values. One head, end to end, on a real sentence. *Interactives:*
   the attention explorer (click a position, see its row over the past); the scale demo.
   *Exercise:* `attention_head` forward, then backward in guided stages.
8. **Heads and positions.** Attention is order-blind, demonstrated (permute the past,
   same mix). Learned positional embeddings added at the bottom; multiple small heads in
   parallel, concatenated and projected, each free to look for something different.
   *Interactives:* the head gallery (every head's map, side by side, on one sentence);
   position-scramble toggle. *Exercise:* `multi_head` forward/backward (reshape plumbing
   guided), positional embeddings into the forward pass.
9. **The block.** Residual stream as "keep what you had, add a correction"; LayerNorm as
   re-centering each position's channel readings (ownership stated: per position, across
   channels); the per-position MLP (course one's layer again, applied at every position,
   with GELU introduced as the field's pick over tanh, difference drawn); pre-norm
   wiring; stacking L blocks. `forward_gpt` exists at this chapter's end. *Interactives:*
   block anatomy (box-and-arrow, the course's central diagram); depth vs the ladder.
   *Exercise:* `layernorm` forward (backward written for you, derived in an Aside),
   `mlp_block`, `transformer_block`, `forward_gpt`.
10. **Training the scribe.** The full config, every number justified against the tab's
    budget (from the spike); AdamW derived as SGD with a per-weight speedometer (free
    design choice labelled, momentum-SGD named as the road not taken); the training loop
    anatomy; overfitting watched on train-vs-val curves; sampling with temperature during
    training. The in-tab run: loss falling live, samples improving, tokens per second
    shown. *Interactives:* the training panel (the two-minute demo). *Exercise:*
    `adamw_step`, `eval_loss`, then a supervised training run through the driver.
11. **Assembly.** The summit. From a blank editor section, the learner writes
    `generate()` and the full training loop that runs their own parts, no driver. The
    parity check runs and gets its banner. No translation table: every field word was
    handed over in the chapter that earned it, so what this chapter carries is the
    inverted list, the words that were only ever ours with nothing in the field to go
    looking for (the line, the ladder, and whatever else the writing coins). The honest
    not-taught list: BPE, dropout, GPU batching and mixed precision, KV-cache inference,
    fine-tuning and RLHF, encoder-decoder architectures. *Interactives:* the workbench
    itself. *Exercise:* `generate`, `train` (the loop), run end to end.
12. **Your own words.** The artifact meets uncurated input: paste anything (song lyrics,
    code, French, emoji). What breaks and what it means: unseen characters at encode time
    (the vocabulary is the corpus's, so the learner hardens `build_vocab` with an
    explicit policy), tiny corpora memorize (the probe: longest generated substring found
    verbatim in the source, a score with its breakdown), rare characters starve, unicode
    multi-codepoint surprises. Ends at the door BPE opens, pointed but not built.
    Chapter 12 is the last page in the course, so it carries the where-to-go-next reading
    list; a thirteenth chapter would take the list with it.
    *Interactives:* paste-and-train workbench with diagnostics (vocab diff against
    Shakespeare, memorization meter, rare-character table). *Exercise:* vocabulary
    hardening, the memorization probe, a written experiment protocol on their own text.

Chapters 11 and 12 are the template's two required closers, designed from the start.

## 5. Content conventions

`CLAUDE.md` is canonical for all of these and wins on conflict. Summary of what it will
say: chapter template (2-3 "what you'll be able to do" items, 5-8 titled sections,
prose beats of 150-400 words, one idea each, recap plus go-deeper, one on-page nav,
section ids prefixed `c<n>-`); register "plotted, narrator muted" with the colleague-email
test; no em dashes; numbers before notation; every equation glossed in plain language;
the sentence-shape bands.

Course-specific conventions settled now:

- **Units:** bits, everywhere, from chapter 3 on. One bits-to-nats conversion sentence in
  chapter 4, where cross-entropy is named, rather than at the end of the course.
- **Coined vocabulary policy:** invented words are bridges, and each hands over to the
  field's word in the chapter that earns it, in one short unlabelled paragraph at its
  first use, after which both words are in play. There is no translation table at the end.
  By tier: **switch** (the field's word becomes primary in the formal registers, the plain
  word stays wherever it carries the intuition) for scores to logits and the guess list to
  a distribution in chapter 4, and mixing to attention in chapter 6, primary from chapter
  7 on; **run both** (the plain word stays primary and the field's word rides along in
  equations and code) for surprise and cross-entropy in chapter 4, since the ladder is in
  bits for twelve chapters and `cross_entropy` is a function the learner writes, for the
  tally and bigram counts in chapter 1 and the embedding table in chapter 4, and for the
  scribe and a decoder-only transformer language model in chapter 9; **local only**, never
  handed over, for the line and the ladder, which chapter 11 lists as ours with nothing to
  go looking for. Nothing is swept downstream: a handover declares an equivalence, it does
  not retire the plain word. Every coined word and symbol gets a notation-reference row in
  the same change, with the field's name on its "also called" line.
- **Anatomy (ownership ontology):** ids live in the stream; parameters live on modules;
  the embedding table owns its rows (a character indexes a row, it does not own one);
  activations live at positions (a position owns its channel vector); attention weights
  live on ordered pairs of positions (the query position owns its row); gradients mirror
  parameters; the loss lives on the batch. Counts, captions and tables get reconciled
  against this.
- **Figure geometry, three families:** grids (tallies, attention maps, embedding tables:
  fixed cell size, value-in-cell where legible), box-and-arrow (model anatomy: one shared
  viewBox width, full column), plots (the ladder, loss curves: natural scale, capped,
  centred). On phones, grid and box families keep a minimum width and pan inside a scroll
  wrapper; plots shrink. New figures join a family.

## 6. Repo layout

```
/                       README, LICENSE, THIRD_PARTY_NOTICES.md, this doc
/CLAUDE.md              working conventions, all FILLs closed
/CASEBOOK.md            incidents (course one's, then this course's appended)
/METHOD.md, /BRAND.md   the kit, unchanged
/src/brand/             the series brand layer (copied from /brand, accent + glyph edited)
/src/chapters/          one file per chapter, plus interactives/
/src/exercises/         sections.json, per-section skeleton/tests/solution/prompt, fixtures/
/src/runtime/           pyodide worker, protocol messages, worker client, python harness
/src/components/        editor, workbench, dock, exercise card, chapter blocks, figures
/src/state/             workbench document, progress, storage, export/import
/public/data/           tinyshakespeare.txt
/src/bench/             committed bench output, imported by the chapters
/tools/                 fetch_shakespeare.py, bench/, fixtures/, check_exercises.py,
                        check_panels.py, check_brand.py, brand_palette.py, og card
/.github/workflows/     deploy to Pages, checks
```

## 7. `CLAUDE.md` seed content

Every `FILL:` in the kit's `CLAUDE.md`, closed on day one with the values in this doc:

- What this is / goals: section 1 above.
- The learner floor: "Finished Moving Parts: Neural Networks, weeks ago. Can read Python
  and NumPy-flavoured code; remembers the shape of training (weights, a loss, gradients
  point downhill, backprop as a chain of slopes) but not the derivations; has never seen
  next-token prediction, tokenization, embeddings, attention, queries/keys/values,
  softmax over a vocabulary, LayerNorm, residual connections, or Adam."
- Hard rules: attribution and licence obligations from section 2, surfaces named.
- Canonical representation: section 3's statement, verbatim.
- Running world: section 4's opening paragraph.
- Exercise contract: Python on pinned Pyodide; one growing file; the seam; the flagship
  parity check.
- Tally quantity: bits of average surprise on held-out Shakespeare (the ladder).
- Chapter go-deeper targets: section 2's table.
- Anatomy: section 5's ownership ontology.
- Coined vocabulary policy, its three tiers and its per-chapter handovers: section 5.
- Figure families and phone behaviour: section 5.
- Exercises one file, with the three invariants and the mutation check named.
- Before-commit commands, pinned versions, commands section: filled with real commands
  once M1 exists; the pin recorded at the spike.
- Decisions section seeded with: component vocabulary, figure families, first-visitor
  front door, bits-not-nats, float64, benches-under-Pyodide, hue and glyph.

## 8. Build milestones

Each ends deployable. Deploy exists from M1 onward.

- **M0, feasibility spike (first).** A reference character GPT (course-authored NumPy,
  the eventual solution code) training in a real browser tab under pinned Pyodide.
  Budget: first loss point on screen within 5 seconds of pressing run; beats the counted
  bigram's rung (bench-measured) within 60 seconds; visibly Shakespeare-shaped samples
  (line structure, speaker-name capitals, word-like strings) by 90 seconds. Knobs if it
  misses: context length down to 32, width down to 48, 1 layer, fewer steps. If it cannot
  beat the bigram in-tab within budget on a mid laptop, the redesign is: train live to the
  budget point, offer "keep training", and ship a committed checkpoint for the demo path.
  The measurement (tokens/sec, loss-vs-seconds curve) is recorded in `CLAUDE.md` and the
  Pyodide version pinned to it.
- **M1, exercise pipeline plus the four cheap machines.** Editor, worker, tests, results,
  hint ladder, persistence, on chapter 4's `softmax` as the guinea pig exercise. Same
  day: the exercise checker (solutions pass, untouched skeletons fail for their own
  reason, mutation check), the bench harness under Node-Pyodide with one real bench, the
  notation reference on the front page (empty), and the deploy workflow, green.
- **M2, chapter 1, read by Pavol.** Rules from the reading written into `CLAUDE.md` and
  `CASEBOOK.md` before any other chapter is drafted.
- **M3, the spine.** Chapters 2 through 11, one at a time, each through the read-and-fix
  loop with a seam review against its neighbours. The summit (11) closes M3.
- **M4, the tail.** Chapter 12, the notation reference completeness sweep, the ladder
  reconciled across all chapters.
- **M5, handoff polish.** Front door, two-minute demo path, progress export, cross-browser
  and 375px checks, then the three end passes as separate commits: teaching review, house
  style (with the committed band-measuring script), reproducibility.

## 9. Open questions

1. **Accent hue.** Green is course one's, and `BRAND.md` names "Ciphers" as another
   sibling, hue unknown from here. Proposal: indigo. Pavol confirms which hues are taken
   before day one edits `brand.css`.
   **Answered 2026-08-31, by Pavol: "Ciphers" never shipped (a placeholder example in the
   kit, since corrected to Transformers in the moving-parts repo). Only green is taken.
   Indigo confirmed, and "the scribe" confirmed as the artifact's name.**
2. **Pyodide hosting.** Pinned CDN URL versus self-hosting the core plus NumPy wheels
   (repo weight versus immortality and the nothing-leaves-your-machine promise). Default:
   pinned CDN. The spike measures cold-load either way and decides.
3. **AdamW versus momentum SGD** for chapter 10. AdamW is the field's choice and likely
   the only one that fits the 60-second budget; the spike measures both. If SGD fits,
   the chapter still teaches AdamW (it is what nanoGPT and the parity fixture use), but
   the derivation beat shrinks.
4. **Backward-pass scope.** The written-for-you set is LayerNorm and GELU. If the guided
   attention backward proves too heavy in M3's read, its stages move toward
   written-for-you one at a time, and the incident gets logged rather than silently eaten.
5. **Chapter 5 (the MLP window).** Kept: it is the chapter that reactivates course one's
   faded skills and earns attention by tallying the window's cracks. If pacing demands a
   cut in M3, it compresses into chapter 6's opener; noted here so the cut is a decision.
6. **Course one's repo as a crib.** The kit marks specific files liftable
   (worker protocol, harness.py, Workbench, DockShell, state layer, checkers). Public
   repo; fetch at M1. If unreachable from the build environment, rebuild to the kit's
   descriptions and note it in section 10.
   **Answered 2026-08-31: cloned read-only in the build environment. The lift happens,
   with each file adapted at the kit's named coupling points. Course one also pins
   Pyodide 314.0.5, which becomes this spike's first candidate.**
7. **Corpus slice sizes per chapter** (chapter 1's on-page tally, bench windows): bench
   decides once it exists; the constraint is that every printed number reproduces.

## 10. What the build actually produced

(Empty. Entries appear here as the build departs from the plan, each with its reason.)
