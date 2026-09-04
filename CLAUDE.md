# CLAUDE.md

Working conventions for building an interactive, self-contained course that teaches a
technical topic to one named learner by making them build the thing.

This file is read at the start of every session. It is the rules only. The incidents
that produced them are in `CASEBOOK.md`, the process that generates new ones is in
`METHOD.md`, and the visual system is in `BRAND.md`. Read this one every time; read the
others once.

Every `FILL:` the kit shipped with was closed on 2026-08-31, before the first chapter,
from the design doc and the M0 spike. A hole left open is not a style question, it is a
bug that will be paid for later at ten to twenty times the cost (`CASEBOOK.md` prices six
of them), so anything reopened gets closed in the same commit that reopens it.

---

## Rule zero

**A fix that does not leave a rule behind will be re-learned.** Every time the learner is
confused, the same commit does three things: fixes the passage, adds a rule to this file
in the learner's own words, and adds the incident to `CASEBOOK.md`. One file, one commit,
provoking quote included. This is the single practice that produced everything below.

**And a fix that was never checked against the confused reader is a guess.** A confusion
report is a symptom, so before any passage changes: re-explain the idea in chat a
structurally different way, and confirm it landed by making the learner use it rather than
by asking whether it made sense, using only what they have already read: a check that
leans on a later chapter is the same defect as the passage it is meant to diagnose, and it
lands on someone already lost. Then port what the working explanation *did*, which is
usually an order, a concrete instance, a named misconception or a missing prerequisite,
rather than what it said. "No change to this passage" is a real outcome of that loop, and
one the old version could not reach. Defects skip it: a crash or a wrong number has a
known mechanism and nothing to diagnose. `/stuck` runs the loop and `METHOD.md` phase 3
states it. [casebook: 24]

## What this project is

At the end the learner can write a working character-level GPT from a blank file, train
it, and explain every matrix in it. They get there by building the scribe: a decoder-only
transformer in float64 NumPy, grown one exercise section at a time and trained live in the
browser tab on Tiny Shakespeare until it writes.

Goals, in priority order:

1. The primary learner (Pavol) understands transformers deeply by implementing a
   character-level GPT, every table and every gradient, in NumPy.
2. The artifact is self-sufficient: a colleague opens a link and finishes with no book,
   no setup, no author involvement.
3. Demoable in under two minutes: open link, show a live figure, show the thing running.

Non-goals: not a PyTorch or GPU course (NumPy only, no autograd framework); BPE is named
and pointed at, never built; no fine-tuning, RLHF, quantization or KV-cache serving; not a
port of nanoGPT (it is the offline parity reference, not a text being followed); decoder
only, never encoder-decoder; no backend, no accounts, no telemetry.

## The learner floor

Finished Moving Parts: Neural Networks, weeks ago, so course one is faded: what survives
is the shape (weights and biases, a loss, gradients point downhill, backprop as a chain of
slopes, a training loop), and the derivations are gone, so this course restates whatever
it leans on. Can read Python and NumPy-flavoured code, and does not write NumPy: every
array operation an exercise needs (a slice, `np.stack`, a dtype) is built here, in the
chapter, on the chapter's own data, before the exercise asks for it. Has never seen: next-token
prediction, tokenization, embeddings, attention, queries/keys/values, softmax over a
vocabulary, LayerNorm, residual connections, or Adam. The absences are the load-bearing
half, because a paragraph can be checked against them. Confirmed by the floor test on
2026-08-31 ("floor is right").

The floor is binding on every chapter, including the last one. Everything above the floor
is built here, in the order the story needs it and never before. It binds downward too: a
section that teaches what the floor already grants costs attention and reads as padding.
Chapter 3 spent three paragraphs dividing counts by a row total and was told it "literally
just explains probability which i think is below the floor". Say what is new (the field's
word, the one consequence the chapter uses) and move on. [casebook: 31]

## Hard rules

- **Never write solution logic into a skeleton file.** Solutions live only in
  `solution.py` (or its equivalent). Skeletons hold stubs, docstrings and contracts.
- This course's obligations, and every surface that carries them: code is MIT and prose
  plus figures are CC BY 4.0 (stated in LICENSE and the README); the offline parity
  fixture generator derives from nanoGPT (MIT, © Andrej Karpathy), so its header and
  THIRD_PARTY_NOTICES.md carry that notice, and if any adapted code ever ships in the
  build, the notice is emitted into the build output and linked from the footer; Tiny
  Shakespeare is public-domain text via Karpathy's char-rnn repo, credited in the README
  and the app footer, with tools/fetch_shakespeare.py holding the URL and sha256. No
  NonCommercial term touches this repo. The prose is original, so no source licence
  reaches the content.
  **Scope the restriction to the material it actually covers, and write that scope down
  before the first chapter.** A course adapted from a NonCommercial source contains two
  kinds of material: the content, which carries the source's terms, and the engine, the
  brand layer and the tooling, which contain none of the source and carry none of its
  terms. Course one shipped saying "this project" inherits CC BY-NC, in the README, the
  app footer and LICENSE, which gave away rights over the one asset that transfers to
  every later course in the series. Note also that BY-NC and BY have no ShareAlike clause,
  so matching a source's licence in the adapted content is a choice rather than an
  obligation that spreads.
  **Prefer a source that is CC0, CC BY, MIT or public domain.** Check before committing to
  a spine, because the licence is chosen once and lived with forever, and BY-NC-ND forbids
  derivatives outright. A NonCommercial spine is survivable if the goal is reach; it is
  fatal if the goal ever becomes revenue.
  **If any source code is redistributed, its notice ships with the build.** A permissive
  licence like MIT asks that the copyright and permission notice travel with the code, and
  a bundler will happily inline the code and leave the notice in the repository. Emit the
  licence file into the build output and link it from the footer. Course one shipped this
  defect.
- **Never invent a class name.** Every class a component renders must already have a rule
  in `styles.css` or `brand.css`; if the thing needs new styling, add the class to the
  family's existing selector list rather than making up a parallel vocabulary. The
  stylesheet is course one's, lifted whole, and it is the vocabulary. Three pages were
  broken this way in three days, each silently: an invented `start` dropped the front door
  out of the reading measure ("start page width leaked out"), invented `control-row`
  classes let a slider overlap its buttons, and `fig fig-box` kept a diagram out of its
  figure family's one scale. Nothing detects this by looking, because the page still
  renders and every other check stays green, so `tools/check_styles.py` enforces it.
  [casebook: 19]
- **No em dashes in any user-facing prose.** Commas, colons or parentheses.
- **No number is written from memory.** See "Numbers" below.

## The canonical representation

- Text is a Python `str`; the corpus is `public/data/tinyshakespeare.txt`, read as UTF-8.
- The vocabulary is `sorted(set(corpus))`; a token is one character; its id is its index
  in that list. `encode`/`decode` are the only crossing between `str` and arrays.
- Token sequences are NumPy `int64`. A batch of windows is `(B, T)`; targets are the same
  windows shifted one character left, also `(B, T)`.
- Axis law: batch axis 0, time axis 1, channels last. Time reads left to right; the past
  of position `t` is `0..t`, self included.
- Floats are `float64` (NumPy's default) everywhere, so naive learner code matches the
  reference bit for bit instead of silently promoting.
- Activations are `(B, T, C)`; per-head attention weights are `(B, H, T, T)`, lower
  triangular after masking.
- Randomness is one `np.random.default_rng(seed)` created by the caller and passed
  explicitly, never global. Parameter draw order is `init_params`'s insertion order and is
  part of the contract.
- Parameters live in one flat `dict[str, np.ndarray]` with dotted names
  (`"blocks.0.attn.w_qkv"`); gradients mirror it key for key. A module is a pair of pure
  functions, `forward(...) -> (out, cache)` and `backward(d_out, cache) -> grads`.
- The loss is mean cross-entropy over every position, **in bits** (base-2 log). Bits are
  the unit everywhere; the one bits-to-nats sentence lives in chapter 4.
`src/python/reference_scribe.py` is the executable statement of all of this.

Drift between chapters is a bug, not a preference. This is the cheapest rule to settle on
day one and the most expensive to retrofit.

## The running world

One story: teaching a small machine to write by reading Shakespeare. The recurring
artifacts, by name: **the line** ("to be, or not to be" and its tally, chapter 1's first
figure), **the corpus** (Tiny Shakespeare), **the tally** (the counts table that becomes,
in turn, probabilities, a learned table, and logits), **the ladder** (the one figure of
bits-per-character every chapter adds a rung to), and **the scribe** (the growing model).
Chapter 12 is the same workbench and the same ladder pointed at pasted text, so the world
carries to the last chapter without re-anchoring. New material connects explicitly to
these artifacts instead of opening fresh abstractions.

Check the last chapter against it before writing the first. A chapter that opens a new
world has to be re-anchored, which is a rewrite, not an edit. [casebook: 7]

## The exercise and test contract

Python on the pinned Pyodide (314.0.5), NumPy only, in a web worker. The exercises are
**one file the learner grows** (a section per exercise, in course order), with the three
invariants from the first commit: the untouched file implements nothing, no section
rebinds a name an earlier section owns, and an unwritten section still lets its chapter
run (the harness lends the course's copy and names what it borrowed). The seam: the shared
drivers (`train_driver`, `sample_driver`, `eval_driver`) take the model as arguments
(`forward_fn`, `params`, `generate_fn`), so chapter 4's bigram and chapter 10's scribe
train through the same loop and later exercises are one-line diffs on the call. The rest
is fixed:

- Tests import the learner's code under one fixed name. Work from earlier chapters
  arrives as an importable library, so a skeleton never contains a previous answer.
- Build the shared library with a **seam** where a later chapter will vary (a swappable
  argument defaulting to the earlier behaviour), so later exercises are one-line diffs
  rather than rewrites. Decide which axis varies before the ladder is built.
- The shared library carries later chapters' functions too, and a capstone patches the
  learner's own saved versions over them, so the final run really is theirs.
- Tests are deterministic: fixed seeds, no wall-clock assertions. Fixtures are hardcoded
  literals, never regenerated at test time, so results cannot drift with library versions.
- Tests run in definition order and fail by raising with a teaching message. The first
  docstring line is the test's display title.
- **Failure messages are teaching content.** Each says what was expected, what was
  received, and the likely misconception behind the gap. The first assertion on any
  returned array checks that it is one: a list handed to `.shape` dies with
  `'list' object has no attribute 'shape'`, which is a crash where the lesson should be
  ("np.stack(rows) glues a list of rows into one array"). [casebook: 30]
- **A table that maps ids to files is derived from the files, never typed.** The
  workbench's starting-body table was a hand-written list beside a folder per exercise,
  and chapter 3's entry was never added, so "opening the exercise in workbench only adds
  the marker to the file and nothing else". No checker read the list, because the
  checker took bodies straight from the folders. Anything keyed by section id (bodies,
  registries, fixtures) is built by a glob over the folders, and the checker asserts the
  glob rather than the entries; and a seed path that finds a section with nothing under
  its marker re-seeds it, because a build that shipped the gap has already written that
  empty section into every learner's saved copy. [casebook: 34]
- **Skeleton docstrings freeze into the learner's saved copy.** The editor persists their
  code, so improving a skeleton never reaches anyone who already opened the exercise.
  Anything essential to the contract must also live in the prompt, which always re-renders.
  This applies to every artifact seeded into a learner's workspace.
- Name the course's **one flagship automated proof** that the learner's implementation is
  right, and celebrate it in the UI when it passes. Here it is **the parity check**
  (chapter 11): the learner's assembled model, loaded with fixed weights and run on a
  fixed batch, must match the committed nanoGPT-derived fixture on its logits, its loss,
  and every gradient in the tree to 1e-6 relative. The workbench banner says it in plain
  words: their NumPy and the field's PyTorch computed the same numbers. The numerical
  gradient check (course one's flagship, rebuilt by the learner as `grad_check` in
  chapter 4) feeds the chapter-level tests along the way.

Day one, not day four: a script that runs every exercise's tests against its reference
solution (all must pass) and against its untouched skeleton (all must fail, for the
skeleton's own reason). It is about a hundred lines and it gates every later content
change. [casebook: 11]

## Numbers

- Every number in the prose is derived in front of the reader, quoted from an earlier
  chapter, or labelled a free design choice with its trade-off. An unexplained constant
  is a bug.
- **Every measured number comes from a committed bench that runs the artifact's own code
  path**, with each bench section printing the prose sentence it backs. Write the bench
  before the prose, not after. Every bench added to course one found errors on its first
  run. [casebook: 9]
- The bench must match the artifact **exactly, not just mathematically**. Same draw
  order, same summation order. Two mathematically identical runs can agree for a while
  and then diverge.
- Two engines (say a JS panel and a Python runtime) produce two sets of numbers from two
  generators. They are not meant to agree: never quote one engine's number for a
  measurement the reader makes with the other, and say which panel a table came from.
- Prefer statistics that hold still: the mean and middle 90 percent of 200 draws
  reproduce; the extremes of that stream do not. Where a run is still moving at the end,
  quote an average over the last several steps.
- **Backward claims get checked like numbers.** Every "chapter N taught X", every
  cross-reference, and every outside-world fact is verified against the source before
  commit. [casebook: 10]
- **A pointer into a figure is a claim about that figure.** "The last two rows", "the
  third column": count them against the artifact rather than from memory, and name the
  row by its own label wherever the prose is not walking the table in order, because an
  inserted row moves every position after it. Chapter 2's cost table shipped a caption
  saying its last two rows were per-spoken-line averages when the last one was a yes-or-no
  capability.
- **Generated text is a number.** A sampled passage, a decoded sequence, a stuck loop:
  anything a run produced gets imported from the bench wherever it is quoted, including
  inside an exercise prompt. Prompts read like prose, so a string typed into one from
  what the run looked like last time passes every check and still contradicts the chapter.
  [casebook: 21]
- **Round once, where the number is displayed.** The bench stores full precision and
  the page formats it. Rounding in the bench and again in the component moves the last
  digit: the space row's `s` is 7.1505 percent, stored as 0.0715 and rendered as 7.1
  rather than 7.2. [casebook: 22]
- **An experiment the reader re-runs prints what the chapter printed.** A walk either
  includes the character it started from or does not, and the chapter, the bench record
  and the exercise snippet make the same choice. Record the number of draws and the
  number of characters under names that say which is which, because they differ by one
  and the wrong one in a sentence is invisible. [casebook: 21]

## Chapter template

Each chapter opens with "What you'll be able to do after this" (2 to 3 items), then 5 to
8 titled sections of short prose beats (150 to 400 words, one idea each) interleaved with
interactives, and closes with a recap and a "go deeper" link to that chapter's canonical
source, fixed per chapter in the design doc's section 2 table (Shannon 1951 for chapter 1
through nanoGPT itself for chapter 11 and Karpathy's char-rnn essay for chapter 12; the
where-to-go-next reading list lives on chapter 12, the last page). Every equation is followed by a one-sentence plain-language gloss.
Each chapter mounts exactly one on-this-page nav that discovers its own section headers
and scrollspies them. Section ids are unique across chapters and prefixed with the
chapter (`c4-`).

## The authoring playbook

Write every chapter to the floor above. These are ordered roughly as they bite.

### Reaching the reader

- **Numbers before notation.** Compute a concrete instance by hand, then name the
  operation and its shorthand. Never the reverse.
- **A metaphor is not a mechanism.** A frame borrowed to make a formula feel natural (a
  guess "costs" bits, the score "charges" for a probability) is a name, and a name may not
  arrive before the thing it names has been shown working on small numbers. Chapter 3
  built its score on cost and charge, asserted a table of bits, and got back "randomly
  assigning cost to probabilities... why?" and "theres a lot of cases you say the word
  charge that doesn't really land". What landed had no metaphor and eight steps in order:
  the goal, a product over four made-up probabilities, the two problems with a product
  (unprintable, and per-character means a root), the same four as powers of 1/2 so the
  exponents add and divide, a second guesser to compare, and only then the word bits and
  the name log. The table of probabilities against bits looked like numbers before
  notation and was not, because nothing derived the second column. [casebook: 31]
- **Interactives carry the algorithm; the formalism recaps it.** Teach the one genuinely
  new idea in prose with concrete numbers, reach the interactive by the page's midpoint,
  and present the formal statements after it as "what you just watched, written down".
  Recap means instantiated: say the job is recognition rather than derivation, write the
  formalism with the interactive's own concrete values (general indices wait until the
  implementation needs them), pair each statement with a number the learner already
  computed (a receipts table), and give direction-of-use and sign-reading their own beat.
  This is the highest-value structural rule here. [casebook: 1]
- **Log first, explain second.** For any multi-stage numeric process, show the full log of
  concrete values (before, after, change) as one figure or table FIRST, then explain each
  stage as a rule that predicts the next logged number from the previous one. Run the
  check in the multiplying direction (factor times change gives the next change), never
  the dividing direction. Claims-first prose floats past a reader; prediction-against-a-log
  lands. [casebook: 1]
- **A comparison is a table, not a run of paragraphs.** When a page prices two options
  against each other on more than two counts, put every count in one table and let the
  prose read the rows. Chapter 2 shipped four paragraphs comparing characters against
  words, each opening with the cost it was about to prove, and got back "this is still not
  very good... is there a succinct picture that can be drawn instead of all the words?"
  One six-row table replaced all four, and the numbers that had appeared from nowhere
  ("where the heck did 39 come from? and 8?") became rows with the derivation in the
  caption. [casebook: 26]
- **"Dense" is a report that a passage needs a figure, not a rewrite.** A reader who
  "thinks i get what it's trying to say, but the writing style is so dense it's hard to
  follow" has no misconception to diagnose, so a re-explanation in more prose is the wrong
  instrument. Two chat pictures did what a third round of prose on chapter 3's score had
  not, and the passage was rebuilt around them ("use these kinds of graphics as the
  primary mode to teach and condense the 2 sections into 1"). Draw the mechanism (each
  step of a log with the number the score keeps beside the one it drops; two routes to
  the same number side by side), keep only the prose that reads the figure, and merge
  the sections that were circling one idea, because two sections circling one idea are
  one section. In `/stuck`, a picture is a structurally different re-explanation, and
  when the report is density it is the first one to try. [casebook: 32]
- **Draw every conceptual jump.** Never ask the reader to imagine a picture; put the
  figure in the page. Before any interactive the reader gets a how-to-read key. Captions
  state counts and label which parts of the figure are the object of study and which are
  scaffolding.
- **Succeed before failing.** The learner solves the easy cases before meeting the one
  that breaks. "Press Show a solution, break it one piece at a time, then rebuild" is a
  valid on-ramp for a fiddly interactive.
- **Demonstrate where the mechanism is visible.** A worked example whose value makes the
  key effect a no-op (multiply by 1, add 0, gap of 0, modulus 1) teaches that nothing
  happened. Lead with an instance where the effect shows, then explain the no-op value as
  the special case it is. [casebook: 3]
- **Teach kinds, not instances.** When several facts repeat one pattern, position-by-
  position derivations read as N separate proofs and lose the reader even when each line
  checks out. Name the pattern once in a concept already taught, sort the instances into
  their few kinds, give each kind one plain-words why plus an extreme case, and colour-code
  the kinds in the figure so the picture carries the grouping. [casebook: 4]
- **State what a section buys before proving it.** Open a stretch of verification with the
  one-sentence payoff it earns, and close by cashing it out. Checks without stated stakes
  read as arithmetic for its own sake. **A check that cannot fail on the chapter's own data
  has no stakes until the prose says what would make it fail.** Chapter 2 reported the
  encode-decode round trip passing on all 1,115,394 characters and stopped there, and the
  reader asked whether the paragraph had "a point besides saying that mapping string to int
  to string gives back the original string". It did not, until it said the one way the
  crossing fails: a character the vocabulary does not contain has no id. [casebook: 27]
- **Tally explicitly.** Count the cost in the text: it is why the next chapter exists.
  The countable quantity every chapter reduces: **average surprise per character, in
  bits, on held-out Shakespeare**, tracked on the ladder. Where a chapter's cost is not
  bits, it is parameter count (chapter 5's window) or seconds of training, and the text
  says which.
- **A score gets a breakdown.** Any aggregate number reported to the learner gets its
  decomposition beside it (per-class counts, the specific confident mistakes, the
  residuals by stratum), never the single number alone.

### Chapters that deliver a fact rather than a capability

A chapter that hands over a property instead of a working artifact has to work harder, in
this order: open with a number the learner produced, name the competing explanations for
it, say which one this page settles and which it leaves standing, and at the end spend the
result back on the learner's own artifact. Anything that looks like a departure (a shrunken
case, hand-placed values, no exercise) is named as a deliberate shrink in the opener, with
its reason, plus the sentence that the small case is a sub-case and not a detour.
[casebook: 7]

### Notation and vocabulary

- **Notation down to the punctuation.** Anything that could read as a typo is notation to
  explain at first use: a trailing comma in a shape, a bare decimal point, an operator
  glyph, slice colons. Language idioms count as much as symbols. Flag order reversals
  explicitly and teach the mechanical check that catches them.
- **Name the glyph, not just the meaning,** whenever code borrows that name. A symbol the
  reader cannot pronounce becomes an unrelated word the moment it appears in an
  identifier. [casebook: 5]
- **Every new symbol and coined term goes in the notation reference in the same change.**
  One folded lookup on the front page: symbol, one line of meaning, the field's name for
  it, and the chapter that introduced it, in the order a reader meets them. Weeks pass
  between chapters, and a symbol defined once four thousand words ago is not defined for
  that reader. The field's name goes in as a muted "also called" line under the meaning
  rather than as a fourth column, because two columns of prose pan the whole lookup at the
  prose measure. [casebook: 8, 17]
- **One word, one meaning.** Reserve the topic's load-bearing words and never reuse them.
  Before coining a noun, check what earlier chapters already call the thing. No word may
  appear before the sentence that defines it, and the defining sentence says that it is
  one. A term used as if known, with its meaning following unlabelled, reads as a
  reference to something the reader missed: chapter 2 wrote "The axis law is fixed for the
  whole course" one sentence before saying what it was, and got back "what is an axis
  law?" **This file's vocabulary is not the reader's.** Axis law, the crossing, the seam,
  the ladder: a phrase that names a rule or an artifact here is a coinage on the page and
  gets introduced like one, meaning first, name second. [casebook: 29]
- **And one thing, one name, or "the same number" said aloud each time a second name
  arrives.** A quantity the prose, the maths and the code each call something different
  is three concepts to a reader until a sentence says it is one. Chapter 2 introduced T,
  "positions in time", window, context window and block_size in three sentences: "a fixed
  number of chars called T, or is the position in time (what's time?) supposed to be T?
  ... i thought T was the lenght??" The reader's own count was the fix: "there are only 2
  concepts here, the index of where we are reading and the window size". Give each one
  letter, t and T, on a concrete window before either letter appears; define time as
  reading order counted from 0 before using the word; and say the last step is T minus 1,
  because a reader who has just learned T as a count will read it as the last index.
  [casebook: 28]
- **A coined word hands over to the field's word in the chapter that earned the idea**,
  not at the end of the course. One short paragraph at the first use of the thing, saying
  what everyone else calls it, after which both words are in play. **Name the field's word
  and stop.** "Both words are in play from here: the crossing when the point is what the
  functions do, a tokenizer when the point is which component they are" is the course
  narrating its own usage policy, and the reader read it as "just defining tokenizer",
  which is all a handover is for; the policy sentence adds nothing to that. [casebook: 27]
  Leave it unlabelled and keep it out of the `<Aside>` box. An opener like "this chapter's naming note is" is
  meta-narration, and a formula a reader skips after the second one; a shaded box says the
  lesson pauses here, which is the wrong signal for the one paragraph whose job is to put a
  word into the reader's working vocabulary. A course built this way is already bilingual
  and silent about it anyway: the equation glosses use the field's words while the prose
  beside them uses the coined ones. So the handover costs almost nothing, and it declares
  an equivalence the reader is already being shown.
  **Do not collect the translations into a glossary on the last page.**
  Three tiers, and the tier decides how much prose changes downstream. **Switch:** the
  coined word stood in for a name that is on page one of everything outside this course,
  so the field's word becomes primary in the formal registers (equation glosses, recap
  items, the "what you'll be able to do" block, exercise prompts) while the prose keeps
  the plain word wherever it is carrying the intuition. **Run both:** the plain word is
  why the idea is comprehensible, so it stays primary and the field's word rides along in
  equations and code. **Local only:** scaffolding for one beat with no counterpart
  anywhere, never handed over, and worth listing at the end as the inverted table: these
  words are ours, and there is nothing in the field to go looking for.
  **Never mass-replace a coined word everywhere downstream of its handover.** The
  handover declares an equivalence; it does not retire the plain word. Course one's
  plainest coined word appears 183 times in its chapter prose, and a sweep that made
  every one of them technical would undo the reason it was coined. [casebook: 17]
- **One anatomy, stated everywhere ownership comes up.** This course's ownership
  ontology: ids live in the stream; parameters live on modules; the embedding table owns
  its rows (a character indexes a row, it does not own one); activations live at
  positions (a position owns its channel vector); attention weights live on ordered pairs
  of positions (the query position owns its row); gradients mirror parameters; the loss
  lives on the batch. Any prose that files a thing with the wrong owner gets
  reconciled in place, including counts, tables and figure captions, which is where the
  violation hides. [casebook: 6]

### Backward references

- **Assume weeks pass between chapters.** Never lean on a bare name from an earlier
  chapter as a load-bearing reference. Restate the thing in a few plain words or drop the
  callback.
- **A callback earns prose only if it removes work or carries the argument.** Removing
  work means the reader has nothing new to learn because it is the same object. Carrying
  the argument means the page's conclusion depends on it. A callback that only says
  "remember this from before" costs attention and returns nothing; cut it. Two callbacks
  to the same earlier figure in one section are clutter.
- **Recognize, do not rebuild.** When a chapter re-derives something the learner already
  built by hand, say so, with the numbers restated. A reader who is not told sees new
  machinery and asks why the ground moved. Watch for silent axis swaps the same way: two
  identical-looking figures that mean different things need saying. [casebook: 2]
- **Say the implicit connections** where the reader will wonder about them, not later.
- **When a chapter takes back a limit an earlier chapter taught, say so at the point it
  happens.** Chapter 1 closed by teaching that the model's memory is one character and
  everything earlier is thrown away. Chapter 2 then assumed a model reads several tokens
  at once, in a subordinate clause, in a paragraph about something else: "seems we made an
  unexplained leap here". A limit the course spent a section teaching is not a detail the
  next chapter may quietly drop. Name the change where it happens, say what it changes in
  (here the data changed several chapters before the model did), and say which later
  chapter actually uses the new freedom, so it does not read as a capability the model
  already has. [casebook: 25]
- **When a chapter teaches the model to do a thing, the next measurement says whether
  the thing is happening.** Chapter 1 taught the tally to write (draw, feed back, repeat)
  and two sections later scored it on the held-back text, and neither chapter said the
  scorer never writes. The reader's intuition was the natural one: "our measure of how
  good the trained model is on the held back text should be allowing the model to generate
  things and then comparing it to the held back text". Say, where the score is first
  taken, that the text is walked with the answer key open (the model reads the real
  character, guesses, is marked against the real next one, and is handed the real one),
  and say why the alternative fails (a generated text parts from the real one within a few
  steps and the comparison measures where). A capability the course just built is the
  first thing a reader will assume every later procedure uses. [casebook: 33]

### Sentences

- **One inference per sentence.** Unpack chains; three steps compressed into one sentence
  loses the reader even when all three are true.
- **Arithmetic goes in display math.** Any tally with more than two terms, and any product
  of more than two factors, becomes display math with labelled braces or a small table
  (knob, value, read off as), never an inline prose sentence of times-and-plus. More
  display math reads lighter than fewer inline products.
- **Three sentence shapes to keep out:** clefts and abstract-first openers ("What no part
  of the argument provides is..."); short pronoun aphorisms, especially as paragraph
  openers; and meta-narration of the exposition ("this section makes X, the next turns it
  into Y"). Give every sentence a concrete subject and a verb, in that order. Describe the
  thing, not the plan for describing it.
- Measurable signature, to audit against the chapters that worked: cleft openers at or
  under 5 percent of sentences, pronoun aphorisms at or under 5 percent, median sentence
  length 19 to 23 words, callbacks 0.4 to 1.2 per paragraph.
- **Cutting words is not the fix when prose reads badly.** Two rounds of cutting turn
  full sentences into telegraphese. Rejoin clauses instead. [casebook: 12]

### Departures and borrowed worlds

- **Departures wear the Aside box.** Anything that pauses the main thread (a borrowed
  analogy, a scope note, a why-digression) goes in the shared `<Aside>` component, never
  in a long parenthetical. The shaded box tells the reader the lesson pauses and resumes.
- **A borrowed mini-world is allowed when the home story has no carrier** for a concept.
  Three constraints: one beat plus one figure, every element mapped back by name, and the
  borrowed vocabulary allowed to run through the section it serves and no further.

### Interactives

- **Interactives carry their own keys.** Each chart's how-to-read key lives on the
  interactive (section titles, one-line legends at the point of use). The prose before it
  keeps only what sections cannot say: the connection to earlier material and the single
  carrying idea. Prose that narrates an interactive's own labels is duplication to delete.
- **Interactives must not jump.** Fixed-basis flex columns (wrap depends on window width,
  never content), reserved heights for changing status text, statuses on their own
  full-width line inside control rows, range inputs allowed to shrink. Live readouts tie
  manipulation to meaning.
- **A hand-built example gets its structure drawn**, in the visual idiom the earlier
  chapters taught the reader to read, with its parts named the way those chapters name
  them. Any chapter that places values by hand rather than deriving them owes this.
  [casebook: 6]
- **Figure geometry is a small closed set.** Three families, decided day one. **Grids**
  (the tally, attention maps, embedding tables): fixed cell size, value in the cell where
  legible, colour from the accent scale. **Box-and-arrow** (model anatomy): one shared
  viewBox width rendered at full column width. **Plots** (the ladder, loss curves):
  natural scale, capped and centred. On phones, grids and box-and-arrow keep a minimum
  width and pan inside a scroll wrapper rather than shrinking labels; plots shrink. New
  diagrams join an existing family. Deciding this at diagram 30 costs a course-wide
  retrofit. [casebook: 13]

### Exercises

- **Exercises are visible.** The output panel shows everything printed, tagged by source.
  A "run my code" path executes the editor without tests. The test source is viewable in
  the page. Hidden test code breeds guessing.
- **A prompt opens by answering where the input comes from, what the thing being
  computed is, and what every argument means.** In that order, before any signature or
  shape. The first exercise of this course opened on
  `count_pairs(ids, vocab_size) returns a (vocab_size, vocab_size) table` and got back
  "very unclear. where is the text i'm counting. what am i counting? what are ids?", three
  questions the prompt had answered nowhere: the caller passes the stream in, a pair is a
  character and its neighbour, and an id is a character's place in the sorted vocabulary.
  A contract states obligations to someone who already knows the nouns, so a prompt that
  starts with the contract is written for the person who has already done the exercise.
  Say what arrives, say what to do with it, then state the shape. [casebook: 20]
- **A word, or an operation, the exercise cannot avoid is taught in the chapter, in the
  same commit as the exercise, however late in the chapter that beat has to sit.** The
  operation half came from chapter 2's batch exercise: the learner had the algorithm and
  a correct list of rows, and the chapter had never shown the one call that glues rows
  into an array, so "i have the alogrithm but can't figure out the precise data
  types/numpy usage ... i don't know how to use the numpy arrays and feel like that
  shouldn't be integral to the course". NumPy is the medium and stays; the gap was the
  course's, because the floor says the learner reads NumPy, not that he writes it. Every
  operation an exercise needs gets one beat on the chapter's own data, in the reader's
  terms (a list of rows becomes one block), not in NumPy's. [casebook: 30] The representation the code
  works in is not an implementation detail to be met in a docstring: chapter 1's prose
  spoke only of characters while its exercise took ids, and the plan put ids in chapter 2,
  so the reader hit the notation of a later chapter inside the first one's exercise. The
  fix is a beat at the point the story first needs it ("the tally has letters on its
  edges, an array has numbers"), shown concretely on the chapter's own small case, and
  named as the sub-case of what the later chapter builds properly. Grep the chapter's
  prose for every noun its exercise's contract uses before shipping the pair.
  [casebook: 20]
- **Every prompt carries a concrete experiment** tied back to an earlier chapter's
  numbers, shipped as a copyable code block with Copy and Send-to-the-scratch-pad buttons.
  Never woven into a prose sentence: an experiment the reader must retype is an experiment
  they will not run.
- **Every snippet the course hands the reader is run by a checker, in the environment
  the reader runs it in.** A prompt's experiment is the reader's first contact with
  their own function on the real corpus, and nothing but a reader clicking had ever
  executed chapter 1's two. `tools/check_panels.py` runs each one against the solved
  document with the corpus in place, and asserts that the chapter's own committed values
  appear in what it prints. [casebook: 22]
- **A URL handed to a worker is absolute.** A relative URL inside a worker resolves
  against the worker script's own directory, not the page's, so it fetches the SPA
  fallback and gets `index.html` with a 200. Resolve it on the main thread against
  `document.baseURI`; the worker asserts that you did. A build whose base is `./`, which
  is what makes the site work from any subpath, is exactly the case where this bites.
  [casebook: 22]
- **A run path that takes the learner's code loads the course's data unconditionally.**
  The scratch pad belongs to no exercise, so reading the dataset off whichever section
  the caret happens to sit in is how a snippet copied from chapter 1 dies with
  FileNotFoundError. Make the field required in the message type, so the compiler asks
  for it rather than a reader. [casebook: 22]
- **A control that hands the learner code puts it in the editor, not only in storage,
  and scrolls to it.** A mounted editor owns its copy of the document, so a write to
  localStorage that nothing pushes into the editor is invisible, and the reader's next
  keystroke writes the editor's stale copy back over it. Send to the scratch pad appeared
  to work once per session, because the first send was what mounted the editor
  ("sometimes it does on the first try but then repeated tries don't work"), and the
  second one was destroyed by the first keystroke after it, in the pad and in Run the
  scratch pad both. Three parts, all three needed: push the text in, scroll to the piece
  that just arrived (the pad shows about six lines at a time), and handle the closed case,
  where the editor mounts holding the text and has to be scrolled once it exists.
  `tools/check_workbench.mjs` is the only check in this repository that mounts an editor.
  [casebook: 23]
- **Decide early whether the exercises are one file or many, because retrofitting is a
  course-wide change.** Many is simpler and isolates failure: a bug in chapter 1 can never
  block chapter 9. One file is what a learner asks for once they have written five of
  them, because it is the only shape where the thing they hold at the end is a thing.
  If you choose one file, the invariant to protect from the first commit is that the
  untouched file implements nothing: hand a chapter its predecessor's work through an
  import and the import wins retroactively for every suite, so untouched skeletons start
  passing. Running the suites cannot detect that. A mutation check can: sabotage a
  provider, require its consumer's suite to notice. [casebook: 16]

### The two closing chapters

Design for both from the start; course one discovered them in a review at the end.

1. **Assembly.** The learner writes the loop that runs their own parts. Every earlier run
   was started by scaffolding, so this is the only assessment of assembly the course has.
   It carries an explicit list of what the course did not teach, and the inverted
   vocabulary list: the words that were only ever this course's own. The translations
   themselves are not here. Each one is handed over in the chapter that earned the idea
   (see "Notation and vocabulary"), because a table of twenty of them on the closing page
   asks for the course's highest-effort operation at its lowest-energy moment.
   [casebook: 17]
2. **Their own input.** The artifact meets data the course did not curate: words, holes,
   unequal classes, wrong scales. Every dataset before it arrived clean, so a learner who
   stops earlier finishes able to explain the technique and unable to use it. [casebook: 14]

**The reading list belongs to the last page in the course, whichever that is.** Add a
chapter after the one that closes with "where to go next" and the list moves, in the same
change. Course one's assembly chapter sat one chapter from the end and closed with five
places to read next, so it had to open that list by saying that another chapter was still
ahead of the reader, which is a page admitting it is in the wrong place; the learner
skimmed both of the last two chapters and kept nothing from either. A reader who reaches an
exit door takes it. Name the section id and its CSS class for the course rather than for a
chapter, so the next move costs nothing. [casebook: 18]

## Register: plotted, narrator muted

Plot chapters like a story (setup, tally, payoff, callbacks). Remove the audible
narrator: the voice that sells, promises, and points at its own storytelling.

- Motivate with numbers, not verdicts. Let the tally be the drama. A judgment is allowed
  once, in plain words, never as a punchline and never twice for rhythm.
  **The tell is a paragraph that opens by naming its own conclusion and supplies the
  evidence afterwards**, which reads as "the annoying writing style which sells you
  something before it proves it's use": "The distinct count is what the second row costs",
  then the counts; "Two more costs come with words", then the costs. Open on the number
  and let the reader arrive at the verdict. This one is not countable, and a session that
  tries will waste the attempt: the obvious proxy, a paragraph whose first sentence
  carries no number while a later one does, flags 50 percent of chapter 1, which the
  learner read without complaint, against 47 percent of the chapter he stopped on. What
  separates them is whether the opener is a label for evidence about to arrive or a fact
  that moves the story, and only a reader can tell. [casebook: 26]
- No promises about the reader's future experience ("it will be short", "you will beat
  this later").
- No stage directions that command attention or feelings ("watch the clock, and count",
  "remember this feeling"). Directing perception at content is fine ("watch how the steps
  shrink as the ground flattens").
- Never narrate the course's own storytelling. Devices stay, labels go: a callback works
  without being announced.
- No flattery or possession theatrics. No moralized vocabulary for algorithms ("the
  honest way", "X cheats").
- Replace aphorisms with their literal content. Punchlines compress by discarding
  information.
- **The test:** could this sentence appear unchanged in a careful colleague's explanation
  email? If not, rewrite it.
- Exception: a chapter's final beat may carry one slightly hot sentence.

Write this section before the first chapter. It touches every sentence, cannot be
enforced mechanically, and retrofitting it is the most expensive pass in the project.
[casebook: 15]

## Before you commit

The commands: `npm run check` runs all of it (typecheck and build via `npm run build`,
then `python3 tools/check_exercises.py`, `python3 tools/check_panels.py`,
`python3 tools/check_styles.py`, `python3 tools/check_brand.py`,
`python3 tools/brand_palette.py --check`); benches run with `npm run bench`. The list is
fixed.

- [ ] Typecheck and production build pass.
- [ ] The exercise checker passes (solutions green, skeletons red for their own reason,
      and if the exercises are one file: nothing passing when it is untouched).
- [ ] Every panel and every prompt snippet that runs the learner's code has been run
      outside the browser.
- [ ] Every bench whose numbers you touched has been re-run, the prose matches it, and
      every snippet the reader runs to reproduce a bench number prints the same thing.
- [ ] You looked at every string you added **in the real artifact**, not just in the diff.
- [ ] Nothing scrolls sideways at 375px, the narrowest supported viewport (deliberate
      pan-in-wrapper figures excepted). A figure's caption is not part of that
      exception: it is prose about the figure, it travels inside the table that
      pans, and a reader should never scroll sideways to finish a sentence.
- [ ] Every new symbol or coined term has a row in the notation reference, and every word
      this chapter coins hands over to the field's word at its first use.
- [ ] Every noun the new exercise's contract leans on is defined in its chapter's prose,
      at first use, not only in the notation reference. Read the prompt as somebody who
      has not done the exercise: does it say where the input comes from before it says
      what shape to return? (Deliberately not a script: a checker comparing contract
      names to prose flags every internal parameter and gets switched off.)
- [ ] Every backward claim in the new prose was checked against the chapter it cites.
- [ ] If this commit fixes a confusion: the diagnosis was checked against the learner
      before the passage changed, this file has the new rule, and `CASEBOOK.md` has the
      incident with what the misunderstanding turned out to be. If the check was skipped,
      because the learner said to just fix it or because two re-explanations died, the
      commit and the incident say so rather than implying a diagnosis nobody made.

## Pinned versions

**Pyodide 314.0.5** (Python 3.14.2, NumPy 2.4.6), the runtime the whole design depends
on. The version string lives in one constant in `src/runtime/pyodideWorker.ts` (and the
bench harness reads the same pin). The measurement that justifies it, from the M0 spike
(tools/spike/README.md, 2026-08-31, headless Chromium): the T=32 C=48 H=4 L=2 B=16 scribe
(64,481 params) trains at 6.2 steps/s and beats the counted-bigram rung (3.5806 bits) at
24.5 s against the 60-second budget. It may not be bumped without re-running the spike.

Content-critical libraries, pinned exactly in package.json (no carets on these): the
NumPy that ships inside Pyodide 314.0.5 (2.4.6, pinned by the runtime pin), codemirror
6.0.2 with @codemirror/lang-python 6.2.1, react 19.2.8, vite 8.2.2, katex 0.18.4. The
lockfile is committed; `npm ci`, never `npm install`, in CI.

## Repo layout

```
/                    README (what, why, how to run, licence, attribution)
/CLAUDE.md           this file
/CASEBOOK.md         the incidents behind the rules
/METHOD.md           the process
/BRAND.md            the visual system
/transformers-design-doc.md
/THIRD_PARTY_NOTICES.md  adapted-code notices (nanoGPT)
/src/brand/          the series brand layer (shared, see BRAND.md)
/src/chapters/       one folder or file per chapter, plus interactives/
/src/exercises/      per exercise: skeleton, tests, solution, prompt metadata
/src/exercises/sections.json  the section table, if the exercises are one file
/src/runtime/        the in-page language runtime (worker, protocol, client)
/src/components/     shared UI: editor, workbench, exercise card, chapter blocks
/src/state/          the document format, and progress persistence
/public/data/        committed datasets
/src/bench/          committed bench output, imported by the chapters
/tools/              build-time scripts, benches, checkers, spike/, fixtures/
/.github/workflows/  checks, then deploy to Pages
```

## Commands

Every generated artifact names the committed script that regenerates it, and every entry
says what it needs. This section is how a stranger reproduces the numbers.

- `npm run dev` serves the course at http://localhost:5175 (pinned, strictPort).
- `npm run build` typechecks and builds the static site into `dist/`.
- `npm run check` runs the full pre-commit list: build, exercise checker, panel checker,
  brand checker, palette checker. Needs Node 22, Python 3 with NumPy.
- `python3 tools/check_exercises.py` alone: solutions pass, skeletons fail for their own
  reason, the untouched document implements nothing, sabotaged providers get noticed.
- `python3 tools/check_styles.py` alone: every class a component renders has a rule.
  `--list-unused` prints the other direction, rules nothing renders yet.
- `npm run bench` regenerates `src/bench/*.json` under the pinned Pyodide in
  Node, printing each prose sentence it backs. CI re-runs it and fails if a
  committed number moved. Needs Node 22 and network for the first
  Pyodide download (cached after). Where the jsDelivr CDN is blocked, the
  NumPy wheel can be taken out of the release tarball on GitHub
  (`pyodide/pyodide` releases, `pyodide-314.0.5.tar.bz2`, about 350 MB) and
  dropped into `.pyodide-cache/`, which is gitignored and where `run.mjs` looks
  first; the same tarball's `pyodide.mjs`, `pyodide.asm.*`, `python_stdlib.zip`
  and `pyodide-lock.json` are what a browser run needs served in the CDN's place.
- `public/data/tinyshakespeare.txt` is regenerated by `python3
  tools/fetch_shakespeare.py` (needs network; verifies sha256).
- The spike re-runs per `tools/spike/README.md` (needs playwright-core and a Chromium).
- `CHROMIUM_BIN=<chromium> node tools/check_workbench.mjs` drives the real workbench in
  headless Chromium against a served `dist/`: every prompt's Send to the scratch pad
  reaches the editor, scrolled to, and survives the next keystroke. Needs `npm run build`,
  `dist/` served (`cd dist && python3 -m http.server 8199`) and
  `npm i --no-save playwright-core`. Out of `npm run check`, which takes no browser and no
  server; add a case to it whenever a control writes into the workbench.
- To drive the rest of the workbench by hand (the only way to catch a fetch the checkers
  stand in for), build, serve `dist/`, and click through with playwright-core; seed
  `tf:v1:code:workbench` and `tf:v1:code:scratch` in localStorage to skip typing.
  Where the Pyodide CDN is unreachable, copy a 314.0.5 release into
  `public/pyodide-local/` and point `PYODIDE_BASE_URL` at it for the run, never in a
  commit.
- `src/exercises/fixtures/parity.json` is regenerated by
  `python3 tools/fixtures/gen_parity_fixture.py` (offline, needs PyTorch; arrives with
  the chapter 9 to 11 work).

## Decisions

Append an entry when something is chosen: what was chosen, when, why, and what was
rejected. Never relitigate an entry; add a superseding one. Include decisions that exist
only to keep two subsystems consistent, since those are the ones a later session breaks
without knowing.

- **2026-08-31, one growing exercise file** rather than per-chapter isolated files, with
  the three invariants and the mutation check from the first commit. Rejected: isolated
  files (course one shipped them and converted at the end, casebook 16).
- **2026-08-31, the loss unit is bits**, everywhere, from chapter 3 on; the bits-to-nats
  sentence lives in chapter 4 where cross-entropy is named. Rejected: nats (the field's
  default) because log2 of the vocabulary reads as "how many yes/no questions", and the
  course is self-contained by goal 2.
- **2026-08-31, float64 everywhere** (NumPy's default). Rejected: float32 (the field's
  default) because naive learner arrays would silently promote and stop matching the
  reference bit for bit. Speed was measured anyway: the spike passes its budget in f64.
- **2026-08-31, benches run under the pinned Pyodide in Node**, so every number the
  prose quotes comes from the tab's own engine. Native CPython appears only in the
  offline parity-fixture generator, whose outputs are committed with a stated tolerance.
  Chapters import committed bench JSON for any table or figure whose numbers the
  prose quotes; free-play interactives compute live and their numbers are never
  quoted. Integer counts are exempt from the two-engines rule, because addition
  agrees across engines; anything a generator or a float touches is not. Rejected: native-Python
  benches (course one's two-engines traps, casebook 9).
- **2026-08-31, accent hue indigo** (`--hue-indigo`, #4b5894); green is course one's.
  Course glyph: the causal mask triangle (the lower-triangular grid drawn in chapter 6),
  in the favicon, the og card, and the series index card.
- **2026-08-31, component vocabulary** (course one's names, kept so cribbed code stays
  readable): Masthead, SeriesFooter, Aside, section headings with the accent rule, Recap,
  the on-this-page nav, ExerciseCard, Workbench in DockShell, TestResults, CodeEditor,
  the notation reference on the front page. Figure families: Grid, BoxArrow, Plot (see
  the playbook).
- **2026-08-31, the front door**: masthead with tagline, a two-sentence what-this-is, the
  series' four-step how-a-course-works, the chapter list rendered from the chapter
  registry (never a second copy), the folded notation reference, the footer with licence
  and credits. No live demo on the front page: the two-minute demo path is front page to
  chapter 10's training panel. First-time visitors see reading, not a spike artifact.
- **2026-08-31, untied output head** (`head.w` separate from `wte`). Rejected: weight
  tying (GPT-2's and nanoGPT's default) because untied keeps "the embedding table" and
  "the scorer" two nameable objects for teaching, at a cost of 65 x C parameters. The
  parity fixture mirrors the untied choice; chapter 11's not-taught list names tying.
- **2026-08-31, GELU is the tanh approximation** (GPT-2's), because NumPy has no erf and
  PyTorch matches it exactly with approximate="tanh".
- **2026-08-31, the bits loss carries its factor into every gradient.** The gradient of
  the fused softmax-plus-cross-entropy is `(probs - onehot) / (B * T * ln 2)`, not
  `probs - onehot`: the mean divides by the position count and the base change divides by
  ln 2. Prose that states the shape states the whole factor with it, because dropping the
  ln 2 leaves a gradient 1.4427 times too large and every gradient check red. The same
  decision fixes the fixture boundary: nanoGPT computes in nats, so
  `tools/fixtures/gen_parity_fixture.py` divides its loss and gradients by ln 2 before
  writing, and asserts that conversion on a fixed batch. Found by a review bot on the
  design doc, which read "probabilities minus one-hot" and asked what happened to the
  base change.
- **2026-08-31, AdamW decays only parameters with ndim >= 2** (nanoGPT's rule), so
  gains, biases and LayerNorm parameters are never pulled toward zero.
- **2026-08-31, Pyodide loads from the pinned jsDelivr CDN URL** (course one's pattern).
  Rejected for now: self-hosting the ~15 MB runtime subset in the repo; revisit only if
  CDN reliability bites a real reader.
- **2026-08-31, a unit of this course is a chapter, and the code still says module.**
  The reader sees "Chapter 1: The next-letter game", the tabs say "1 · Counting", and
  section ids are prefixed `c1-`, because this file, `METHOD.md`, the design-doc template
  and the `/chapter` command all prescribe chapter. The stylesheet and the shared
  components keep course one's `module` vocabulary (`.module > p`, `ModuleBits`,
  `module-picker`), which is what makes them liftable and is invisible to a reader. Do not
  half-fix this: renaming the code buys nothing and breaks the lift, and renaming the
  prose contradicts four documents. Rejected: matching course one's reader-facing
  "modules", which would mean stripping chapter out of three kit docs and changing the
  `c4-` id convention for every future course. Course one is the outlier and is renamed
  separately, with `#m1` to `#c1` hash aliases so shared links survive.
- **2026-08-31, dev server port 5175, strictPort** (course one pinned 5174; different
  port so both courses can run side by side). localStorage keys are prefixed `tf:`.
- **2026-09-02, the dock may be dragged to a 576px column** (`COLUMN_FLOOR`), rather than
  to the 752px that keeps every box in the measure set at its full width. The learner
  asked for more travel, and 752 was protecting reflow rather than preventing damage:
  the measure-set boxes carry `min-width: min(..., 100%)` and the figures pan inside
  their wrappers, which is the path the 375px phone layout already takes. 576 is the
  560px phone-media band plus room for a scrollbar, and it is a floor rather than zero
  because those phone rules are keyed to the window: a column narrower than the band
  they cover would go without them. Checked at 1920 against both the old maximum and
  the phone: same overflow findings, no new ones, and no page-level sideways scroll.
  Rejected: making the 560px rules column-aware, which would buy the last 200px at the
  cost of auditing every phone rule in the stylesheet. `TABS_FOLD` (880, where the tab
  strip gives way to the picker) is now its own constant, because it had been written as
  `COLUMN_FLOOR + 128` and would otherwise have followed the floor down and left the
  strip crushed between 704 and 880.

- **2026-09-03, the ladder renders whatever rung list it is handed, and each chapter's
  bench emits the whole list up to itself**, recomputing the earlier rungs in the same
  engine, so the numbers on one drawing never come from two benches or two runs.
  Rejected: one shared rung file merged from several benches, which puts a merge step
  between the bench and the figure that nothing regenerates.
- **2026-09-03, the ladder has a letter-frequency rung** between the ceiling and the
  counted tally, an addition to the design doc's two: with two rungs the ladder is a
  line, and the middle rung is what makes "context buys bits" visible on the day the
  figure debuts (6.02 to 4.83 for knowing which letters are common, 4.83 to 3.58 for
  knowing the one before). It is smoothed the same way as the tally.
- **2026-09-03, the surprise meter opens unsmoothed**, and chapter 3 turns smoothing on
  only after the reader has jumped to the first pair the counting never saw and watched
  the average go infinite (succeed, break, fix). The exercise's default alpha is 1, so a
  learner who runs the snippet gets the ladder's rung without choosing.

- **2026-09-04, the drivers are course code with the model passed in as functions.**
  `train_driver(params, ids, forward_fn=, backward_fn=, loss_fn=, loss_backward_fn=,
  step_fn=, ...)` and `eval_driver(params, ids, forward_fn=, loss_fn=, block_size=)` live
  in `reference_scribe.py`, are exported by `course_helpers.py` beside `split_data`, and
  are lent to the scratch pad by name the way `load_corpus` is (the list is in
  `harness.py` and mirrored in `tools/check_panels.py`). Chapter 4's exercise writes the
  model (`init_bigram`, `bigram_forward`, `bigram_backward`, `sgd_step`) and calls the
  driver; chapter 10's call is the same line with the scribe's functions. Rejected: the
  learner writing the loop in chapter 4, because chapter 11 is where assembling the loop
  is assessed and a second copy of it would make that assessment a repeat.
- **2026-09-04, a live panel whose end number the prose quotes runs the reference code
  path in the worker at the bench's own seed and settings.** Chapter 4's trainer sends
  `runPython` with a driver that calls `reference_scribe.train_driver` exactly as
  `tools/bench/chapter4.py` does, so its default run ends on the bench's 3.6096 and the
  prose may say so (checked in headless Chromium: same four numbers). A knob moved makes
  the run the reader's own and nothing about it is quoted. The panel's defaults are
  numeric constants in the panel file, which `check_panels.py` substitutes into the
  Python and runs natively. Rejected: training in JavaScript, which is a second engine
  and could never be quoted; and a panel that plays back the bench's committed curve,
  which is not training.
- **2026-09-04, `cross_entropy` is written on the learner's own `softmax`** (probabilities,
  then minus log2 of the one picked), rather than the fused log-sum-exp form. It is the
  literal transcription of chapter 3's score, it puts a provider-consumer edge under the
  mutation check (a sabotaged softmax breaks the loss's suite), and the reference now
  computes it the same way so the solution is sliced from the reference. Rejected: the
  fused form, which is more robust to extreme scores but asks the reader to trust a
  rewriting the chapter has no beat for.

## Known non-bugs, do not chase

- The Pyodide boot prints loader noise to stdout; the worker tags everything before boot
  as runtime output, so it never shows as the learner's own print(). Inherited from
  course one, deliberate.
- In-tab training runs about 3.5x slower than native CPython on the same machine (wasm,
  single thread, no SIMD BLAS). Measured at the spike; not a regression to fix.
- The spike page logs a favicon 404 in the console; tools/spike ships no favicon on
  purpose (it is an instrument, not a page anyone lands on).
- pip's "running as root" warning in CI logs is noise from the runner image.
