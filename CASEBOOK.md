# Casebook

Twenty-six incidents, the first eighteen from course one (neural networks) and the last
eight from course two (transformers), each a place where the work failed a real
reader, and each the reason a rule exists in `CLAUDE.md`. Read this once. The rules
are what you follow; these are what makes them credible, and what tells you whether a rule
you are tempted to bend is load-bearing.

Every quote is the learner's own. The cost column is the commit that fixed it, so you can
see what a late-settled convention actually costs. From incident 24 on, an entry that came
out of the `/stuck` loop also records **what the misunderstanding turned out to be**, which
is frequently not what the learner's quote pointed at, and **which re-explanation landed**,
which is the part a later chapter can reuse.

---

## 1. "Over my head", then "lost the concept and got math heavy"

**Chapter:** backpropagation, the idea. The hardest conceptual chapter in the course.

**What was wrong.** The first draft put nine equations and 1,200 words before its
centerpiece interactive, and taught the four formal statements with abstract layer indices
after pages of concrete language. The learner stopped.

**The fix.** Teach the one genuinely new idea in prose with concrete numbers; reach the
interactive by the page's midpoint; present the equations after it as "what you just
watched, written down", written with the interactive's own layer numbers, each paired with
a number the learner had already computed by hand in a receipts table. Direction-of-use and
sign-reading got their own beat, because neither is visible in the symbols.

A second draft of the same section failed again on the numbers: claims-first prose ("nudge
w and z moves by x times that amount") floated past the reader, and what landed was showing
the full log of before/after/change values first, then explaining each stage as a rule that
predicts the next logged number from the previous one.

**Rules:** "Interactives carry the algorithm; the formalism recaps it" and "Log first,
explain second".

**Cost:** two restructures of the same chapter (4 files, +213/-157, then 3 files, +73/-22),
inside a chapter that was rewritten four times in one day.

## 2. "A neuron is a straight line trying to divide data up" to "pairs of them making bars"

**Chapter:** universality.

**What was wrong.** The chapter re-derived three artifacts the learner had already built by
hand in chapters 1 and 2, without saying so. He read new machinery and asked why the ground
had moved.

**The fix.** Name each identity explicitly, with the numbers restated: this switchover is
chapter 1's decision boundary with one input removed; this bump is chapter 1's own network
with the squash taken off; this thresholding unit is chapter 1's output unit doing what its
bias did. The same commit found a silent axis swap: two identical-looking square plots
that meant entirely different things.

**Rule:** "Recognize, do not rebuild."

**Cost:** 2 files, +106/-19, on day five, on a chapter shipped on day three.

## 3. "Changing by 0.01 changes it by 0.01, so what?"

**Chapter:** backpropagation, the idea.

**What was wrong.** The chapter proved "the change comes out multiplied by the partner" on
the one hop whose partner happened to be 1.0. A worked example whose value makes the key
effect a no-op teaches that nothing happened.

**The fix.** Lead with the times-2 wire, where the effect shows, and explain 1.0 afterwards
as the special case it is.

**Rule:** "Demonstrate where the mechanism is visible." Watch for multiply by 1, add 0, gap
of 0, modulus 1, transposition by a unison.

## 4. Five correct derivations that read as five separate proofs

**Chapter:** backpropagation, the idea.

**What was wrong.** Five factors along a chain, each derived position by position. Every
line checked out and the learner lost the thread anyway.

**The fix.** Name the pattern once, in a concept already taught ("every factor is a slope,
chapter 3's kind of number"), sort the five into their few kinds, give each kind one
plain-words why plus an extreme case, and colour-code the kinds in the figure so the picture
carries the grouping.

**Rule:** "Teach kinds, not instances."

**Cost:** 3 files, +178/-51.

## 5. The symbol with no spoken name

**Chapters:** 3 onward.

**What was wrong.** The course said the gradient is written with an upside-down delta, and
never said the symbol is read "nabla". Every later prompt and skeleton then used `nabla_w`
and `nabla_b`, which read as an unrelated word.

**The fix.** Name the glyph where it first appears, then bridge to the code names at their
own first use.

**Rule:** "Name the glyph, not just the meaning, whenever code borrows that name." This
generalizes to any topic whose identifiers come from its notation.

**Cost:** small (4 files, +19/-4) and only because it was caught mid-course. The same class
of bug, left until the end, is incident 8.

## 6. "Why is the weight on the wire and not the neuron?" and "Is this a single neuron per layer?"

**Chapters:** 1, 2 and 4, then 6.

**What was wrong.** Two bugs, one question each. First, the prose filed weights with
neurons in some places (counts, matrix rows) and with wires in others, so ownership was
never settled. Second, a chapter placed values by hand to build a small network and never
drew it: the shape had to be inferred from a plot of curves, and the prose coined "output
weight", a term the course never established, which filed a weight with a neuron again.

**The fix.** One anatomy, stated everywhere ownership comes up, and reconciled in place
wherever prose violated it, including counts and figure captions. Any hand-built example
gets its structure drawn in the idiom the earlier chapters taught, with its parts named the
way those chapters name them.

**Rules:** "One anatomy, stated everywhere ownership comes up" and "A hand-built example
gets its structure drawn".

**Cost:** 9 files, +549/-34 (bundled with the section-navigation retrofit).

## 7. "We're just talking about curves..... why??"

**Chapter:** universality. The learner stopped five sections in.

**What was wrong.** The chapter delivered a *fact* rather than a capability, and it opened
in a new world: continuous input, a 0-to-10 rating, no training, no exercise, with its only
connection to the course in the closing beat. Every previous chapter had handed over a thing
the learner then owned.

**The fix.** Open with a number the learner produced, name the competing explanations for
it, say which one this page settles and which it leaves standing, and at the end spend the
result back on the learner's own artifact. Name the shrink (one input instead of 784,
hand-placed values instead of trained ones) as deliberate in the opener, with its reason,
plus the sentence that the small case is a sub-case and not a detour.

**Rules:** "Chapters that deliver a fact rather than a capability" and the requirement that
the running world can carry the last chapter, not just the first.

**Cost:** 3 files, +384/-196, a full reframe of a finished chapter, 23 minutes after the
rule was written down.

## 8. The notation reference that arrived last

**Chapter:** all of them.

**What was wrong.** The course's own rule said weeks pass between chapters. Nothing acted
on it: symbols were defined once, thousands of words before a returning reader would want
them, with no lookup anywhere.

**The fix.** A folded reference on the front page: symbol, one line of meaning, the chapter
that introduced it, in the order a reader meets them. Plus the rule that introducing
notation means adding its row in the same change.

**Cost:** 36 rows back-filled in one commit (8 files, +429/-7) after all ten chapters were
written, and 7 more rows in the pass after that. Creating it empty on day one is free.

## 9. Numbers published before the code that produces them

**Chapters:** 6, 7 and 8.

**What was wrong.** Every measurement two chapters quoted came from a throwaway script that
no longer existed, so nothing could be re-verified when a helper changed.

**The fix.** A committed bench per chapter that runs the artifact's own code path, each
section printing the prose sentence it backs.

**What it found on its first run:** three numbers that no longer reproduced. Two traps
worth knowing, both discovered here: the initializer drew every weight and then every bias,
so a bench that interleaved them built a different network from the same seed; and the
gradient step summed per-example contributions in a loop, so a vectorized bench rounded
differently, which a deep network amplified into a two-point divergence after seven epochs.

**Rule:** "Every measured number comes from a committed bench that runs the artifact's own
code path", including the clause that the bench must match **exactly, not just
mathematically**.

**Cost:** 7 files, +651/-18, four chapters too late. Every bench added in this project
found errors on its first run.

## 10. Numbers and backward claims written from memory

**Chapters:** several.

**What was wrong.** "Both numbers I first wrote from memory were wrong (the worst digit is
8, not 5, and the 7 was read as a 2, not a 1), which is what the bench is for." Elsewhere,
a first draft claimed a score and two behaviours that the bench disproved, and a table was
factually wrong about where two of the four equations fire.

**The fix.** No number is written from memory, ever. And the other half, which nothing had
covered: every "chapter N taught X" claim, every cross-reference, and every outside-world
fact gets checked against the source before commit.

**Rule:** "Backward claims get checked like numbers." A course that quotes its own earlier
chapters constantly grows this class of bug faster than it grows content.

## 11. Nothing checked the exercises until seven of them existed

**What was wrong.** "Nothing verified the exercises except a person clicking through seven
of them in a browser, so a change to a test, a skeleton or a solution could break an
exercise silently."

**The fix.** A script that asserts both halves: every reference solution passes every test,
and every untouched skeleton fails every test for the skeleton's own reason.

**Cost to build:** 122 lines, one commit, on day four. It then gated every content change
after it. This is a day-one artifact.

## 12. "Dense, backwards, vague, clippy"

**Chapter:** universality, again.

**What was wrong.** Four things at once. Cleft and abstract-first openers that front a
placeholder and delay the content. Four consecutive paragraphs opening with a pronoun whose
antecedent was five paragraphs away. Meta-narration of the exposition itself. And
telegraphese: the chapter had been through two rounds of word-cutting, which is exactly
what made it clippy.

**The fix.** Give every sentence a concrete subject and a verb, in that order. Name the
subject each time, even at the cost of a longer sentence. Describe the thing, not the plan
for describing it. And **rejoin clauses instead of cutting them** when prose reads badly.

**Rule:** "Three sentence shapes to keep out", with the measurable bands (cleft openers and
pronoun aphorisms at or under 5 percent of sentences, median sentence length 19 to 23 words)
so the taste becomes an audit.

**Cost:** part of the 20-file house-style pass (+1096/-491), the largest revision commit in
the project.

## 13. Figure geometry decided at diagram thirty

**What was wrong.** Diagrams had accumulated one at a time, each sized to look right on its
own, so no two shared a width and none had a defined behaviour on a phone.

**The fix.** Exactly two families: a box-and-arrow family sharing one fixed viewBox width
rendered at full column width (a narrower layout is centred by shifting the viewBox, never
by scaling), and a plot family rendered at natural scale, capped and centred. On narrow
screens the box family keeps a minimum width and pans inside a scroll wrapper rather than
shrinking its labels. New diagrams join a family.

**Cost:** 6 files, +51/-16 to retrofit, and free to decide on day one.

## 14. The learner who could explain it and could not use it

**Found by:** a teaching review of the finished course.

**Two gaps, both invisible from inside a chapter.**

*Assembly.* The learner owned seven functions and had never assembled them: every training
run in the course was started by a course-written panel. The other 37 tests checked parts.
He also finished speaking a private language, since the course had deliberately invented
its own vocabulary and never translated it back.

*Curated input.* Every dataset in the course arrived numeric, scaled, complete, labelled
and split. A learner finished able to explain the technique and unable to point it at
anything.

**The fix.** Two closing chapters. One where the learner writes the loop that runs their
own parts, carrying a translation table into the field's vocabulary (the table was the
wrong shape, which is incident 17) and an honest list of what the course did not teach. One
where the artifact meets a second dataset chosen for its defects: words, holes, unequal
classes, and measurements 245 times apart in scale, where skipping one preprocessing step
drops the network to the majority-class baseline and a 73.5 percent score turns out to hide
a class it never once predicts.

**Cost:** two whole chapters (16 files +1154, and 17 files +1569) and a change to the
project's stated goals, at the very end. Both are designable from the start.

## 15. The narrator, muted four chapters late

**What was wrong.** The prose sold, promised, gave stage directions, and pointed at its own
storytelling. Verdict punchlines, promises about the reader's future experience, moralized
vocabulary for algorithms, flattery.

**The fix.** The whole register section in `CLAUDE.md`, with the operational test: could
this sentence appear unchanged in a careful colleague's explanation email?

**Cost:** a retrofit over four finished chapters (7 files, +97/-75) that then did not hold.
The drift had to be chased in four further commits, and the final house-style pass found the
same drift again from chapter 6 onward. Voice is the cheapest thing to settle first and the
most expensive to retrofit, because it touches every sentence and cannot be enforced
mechanically.

---

## 16. Nine editors, and nothing to hold at the end

**What was wrong.** The learner, after finishing most of the course: "it would be awesome
for there to be a side panel/workbench where every exercise simply allows me to add on code
so that by the end of it i have a single piece that i understand and have built up ... might
feel more cohesive throughout instead of a random embedded window on each module."

Two complaints in one sentence, and the second is the sharper. The editor sat several
thousand pixels into each chapter, so reading the prompt and typing the answer meant
scrolling between them. And the nine exercises were nine isolated files: each opened with a
line handing it the previous chapters' work out of a shared library, so the learner's own
function was never what their next function called. By the last chapter, the capstone's own
call map had to admit in a caption that three of the names in it ran the course's code.

**The fix.** One panel docked beside the reading column, and one growing file: a section per
exercise, in course order, plus two marked "written for you" so the file needs nothing but
the language's array library. A section the learner has not written yet is filled in from
the course's copy for the run, and the panel names what it borrowed, so a reader who opens
the last chapter first still gets a run.

**What made it expensive was not the panel.** It was that the isolated model had been
hiding a live bug. Concatenating the nine untouched skeletons in their old state passed
**19 of 52 tests**: the library import in a later section rebound a name an earlier section
defined, and the harness executes the whole document before the tests import from it, so the
last binding won retroactively for every suite. A learner pressing Run tests before writing
anything would have been told five functions were already finished. Running the suites
cannot detect this, because everything is green. Only a mutation check can: sabotage a
provider, require its consumer's suite to notice.

**Cost to fix:** a course-wide change touching the exercises, the harness, the worker
protocol, every payoff panel, the stylesheet, the app shell, both checkers and the prose in
seven chapters. Deciding it on day one costs nothing.

**The rule it bought.** Decide in the design doc whether the exercises are one file or many,
and if one file, write down the three invariants it needs from the first commit: the
untouched file implements nothing, no section rebinds an earlier section's name, and an
unwritten section still lets its chapter run.

## 17. "A big brain dump of all of these terms that I now need to swap in my head"

**Chapter:** the assembly chapter, and every chapter before it.

**Found by:** the primary learner, having finished the whole course.

**What was wrong.** The course invented plain words on purpose, so that each idea could
arrive before its name, and then translated all of them at once: a twenty-row table on the
closing page, after the final exercise. That page asks for the highest-effort operation in
the course, re-indexing twenty concepts learned under other names, at its lowest-energy
moment, and there is nothing downstream to use the new words on.

The sharper half was invisible from inside any one chapter. The course was already
bilingual and silent about it. Its equation glosses used the field's words while the prose
beside them used the coined ones: "the weight matrix" in one chapter's gloss, "the layer's
wire ledger" twenty lines below it, seven uses each before the closing table arrived. The
field's vocabulary was reaching the reader unlabelled all along, so withholding the names
had bought nothing and had cost the reader the equivalence.

**The fix.** One short paragraph per chapter, at the first use of the thing, saying what
everyone else calls it, after which both words are in play. Unlabelled: seven of the eight
opened with "this chapter's naming note is" in the first draft, which is meta-narration and
a formula a reader skips after the second one. None of them wears an aside box either,
because a shaded box says the lesson pauses here, and this paragraph's whole job is to put
a word into the reader's working vocabulary.

Three tiers decide how much prose changes downstream, and the point of having tiers is that
most of the prose does not change: **switch** (the field's word becomes primary in the
formal registers only), **run both** (the plain word stays primary and the field's word
rides along in equations and code), **local only** (scaffolding for one beat, never handed
over). The closing page keeps the inverted table, six rows: these words are ours, there is
nothing to go looking for.

**Rules:** "A coined word hands over to the field's word in the chapter that earned the
idea", and the "also called" line in the notation reference.

**Cost:** naming notes back-filled into eight finished chapters, 17 "also called" lines
added to a 56-row notation reference, and the closing chapter's central section replaced.
The commit that fixed this and incident 18 together is 15 files, +533/-280, on a course
that was finished. One paragraph written at the moment the word is coined costs nothing.

## 18. The exit door one chapter before the exit

**Chapter:** the last two.

**Found by:** the primary learner, who reported skimming both of them and internalizing
nothing from either.

**What was wrong.** The assembly chapter closed with a five-item reading list one chapter
before the end, so it had to open that list by telling the reader that another chapter was
still ahead of them. A page that has to explain why its own exit is not the exit is in the
wrong place, and a reader who reaches an exit door takes it.

The list had been in the right place twice already: it ended chapter 8 when chapter 8 was
last, and moved to chapter 9 when chapter 9 was added. Then chapter 10 arrived and it did
not move again, and both closing chapters were written around it while it sat in the middle.

**The fix.** The reading list belongs to the last page in the course, whichever that is,
and adding a chapter after it moves the list in the same change. Its section id and CSS
class are named for the course rather than for a chapter, so the next move is free.

**Rule:** "The reading list belongs to the last page in the course, whichever that is."
It generalizes: anything that says "this is the end" gets re-checked when the end moves,
and in a course whose last chapters are discovered in a review (incident 14) the end moves
at least twice.

**Cost:** the same commit as 17, and free at any point if the question is asked when a
chapter is added.

---

## 19. "start page width leaked out"

**Course:** two (transformers), day one, found by the learner on the deployed site.

**What was wrong.** The front door's prose ran the full 1140px column instead of the
34rem measure, so the page read lopsided against its own centred masthead. The cause was
one word: the article was written `className="start"`, and nothing in the stylesheet
selects `.start`. Course one's front door carries `className="module start-page"`, and
both halves are load-bearing: `module` is what the measure rules select
(`.module > p, > ul, > ol`), `start-page` is what the front door's own section headings
and their accent rules select.

The same mistake had already been made twice in the same week, both times by inventing a
name instead of reading the stylesheet: a control row built from `control-row`,
`control-label` and `control-value`, none of which existed, which let a slider overlap its
own buttons; and a figure marked `fig fig-box`, which kept it out of the box-and-arrow
family's one scale. A repository whose Decisions section already said "component
vocabulary: course one's names, kept so cribbed code stays readable" got it wrong three
times in three days, which is what makes this a tooling problem rather than a discipline
problem.

**Why nothing caught it.** Every check was green. The build compiles unknown class names
happily, the typechecker has no opinion about strings, and the page still looks like a
page: prose, headings, a footer, all present and all painted. Only a reader comparing it
against its sibling saw it. The two chapter pages were fine throughout, which is what made
the front door's version look plausible.

**The fix.** `tools/check_styles.py`: every class a component states outright must have a
rule in `styles.css` or `brand.css`, with a short allow-list of deliberately unstyled
hooks carrying a reason each. It reads only the unambiguous forms, a plain
`className="a b"` and a template's static text, because a first version that also read
ternaries reported `?`, `===` and the comparison string `"passing"` as missing classes,
and a checker with false positives gets switched off. All three real bugs were plain
literals, so the narrow rule loses nothing that has ever broken a page. Verified by
reintroducing the defect and watching the checker name it.

**Rule:** "Never invent a class name", in the hard rules, plus the checker in
`npm run check` and in CI.

**Cost:** the fix was one word; finding it took a reader on a deployed site, and the
checker that makes it impossible again is 120 lines written the same day.

## 20. "where is the text i'm counting. what am i counting? what are ids?"

**Chapter:** two (transformers), chapter 1's first exercise, on the day it shipped.

**What was wrong.** The learner read the Counting pairs prompt and reported it "very
unclear", with three questions. Each one names something the page never said.

*Where is the text.* The prompt opened on the function's signature and never mentioned
that the stream is handed in by the caller, so the obvious reading is that the exercise
expects you to find the corpus yourself.

*What am I counting.* "Pairs" had been concrete in the chapter's prose, where the reader
counted them by hand, and turned abstract in the prompt, which said "entry [a, b] is the
number of times character b came directly after character a" without ever saying the plain
version: look at each character together with the one right after it.

*What are ids.* The load-bearing one. Chapter 1's prose never used the word: it spoke of
characters throughout, and the words id, vocabulary and vocab_size appeared for the first
time inside the exercise contract. The design doc had planned ids for chapter 2, so the
first exercise of the course was written in the representation of the chapter after it.
The notation reference had a row for it, which is no help: that lookup exists for a reader
returning weeks later, not for first use.

**Why nothing caught it.** Every check was green, and the exercise itself is correct: the
tests pass, the solution passes, the skeleton fails for its own reason. A contract can be
complete and still be unreadable, because completeness is measured against someone who
already knows the nouns.

**The fix.** A beat in the chapter, at the point the story first needs numbers rather than
letters, immediately before the exercises: the tally has characters on its edges and an
array does not, so each character gets its place in the sorted list of characters, shown
as a strip of the line's own eight characters with 0 to 7 under them, and named as the
small version of what chapter 2 builds properly. Then both prompts and both skeletons
rewritten to open with where the input comes from, what is being counted in plain words,
and what each argument is, before any shape.

**Rules:** "A prompt opens by answering where the input comes from, what the thing being
computed is, and what every argument means", and "A word the exercise cannot avoid is
taught in the chapter, in the same commit as the exercise".

**Cost:** one chapter beat, one figure, two prompts and two skeletons, on a chapter that
was hours old. The generalizable half is cheap and mechanical: before shipping an
exercise, grep the chapter's prose for every noun the contract uses.

## 21. The loop the chapter showed and the loop the exercise printed

**Chapter:** two (transformers), chapter 1, found while re-reading the exercise prompts
the day after they were rewritten.

**What was wrong.** Chapter 1 closes its writing section by taking each row's most common
successor instead of drawing one: from a `t` the output is `the the the the the the t`
forever, a string the prose quotes out of the committed bench. The exercise after it hands
the reader a snippet that walks the same way, and the snippet printed
`he the the the the the t`, the chapter's string with its first character missing. The
bench seeds its list with the character it starts from and the snippet did not. The prompt
then described the snippet's output as "he the the the", typed by hand from a run rather
than imported, so the repository held two strings for one walk and nothing connected them.

The same off-by-the-starting-character sat in the bench's own record. `favourite_loop` was
written `{"chars": 24}` beside a 25-character string, and `sample` `{"chars": 220}` beside
a 221-character passage, because in both cases the number counts draws rather than
characters. Chapter 1 read that key out and told the reader "Here is 220 characters of it"
above a block holding 221.

**Why nothing caught it.** Every check was green and every number was real. The bench ran,
the chapter imported it, the exercise's tests pass, and both strings are correct outputs of
correct code: outputs of two walks that disagree about whether the character you start from
is part of what the walk wrote. The prompt's hand-typed copy was the only place the
disagreement was visible, and it was on the wrong side of it. It matched the snippet, so a
reader checking the prompt against the code it ships would find them consistent and the
chapter, three screens up, wrong.

**The fix.** The snippet seeds its output with the starting character, so it prints the
chapter's string exactly, and the prompt quotes `bench.favourite_loop.text` instead of a
typed prefix. The bench records `steps` and `chars` separately for both walks, along with
the `start_char` each began from, and chapter 1's sentence counts draws where it means
draws.

**Rules:** "Generated text is a number" and "An experiment the reader re-runs prints what
the chapter printed", both under Numbers.

**Cost:** four lines, before a reader reached it. The class is what makes it worth an
entry: a course whose method is "now run this yourself" puts a snippet beside every quoted
output, and every one of those is a place where two programs can disagree by one character
with every check green.

## 22. "screatch pad didn't work right after exercise 1"

**Chapter:** two (transformers), chapter 1, found by the learner on the day it shipped,
one exercise into the course.

**What was wrong.** The learner finished the first exercise, pressed Send to the scratch
pad on the experiment the prompt hands them, ran it, and got
`FileNotFoundError: [Errno 44] No such file or directory: '/tinyshakespeare.txt'` on
line 1. Every prompt in the course opens its experiment with `load_corpus()`.

The worker fetches a dataset when the request carries a `dataUrl`, and the scratch pad's
request read that field off the exercise belonging to whichever section the caret sat in.
No exercise sets it. The field had been lifted from course one along with the runtime,
where its comment records the same bug one course earlier: "Module 10's prompt says to
open /penguins.json, and nothing had ever put it there." The mechanism was there, unused,
with the incident that created it written on it.

Running the snippets turned up two more. Chapter 1's tally experiment counted the whole
corpus, while the chapter's table counts the first nine tenths, so a reader checking their
own function against the table read 609 where the page said 563, with nothing to explain
the gap; and its four rows were the four the chapter already showed, under a sentence
promising rows it had not. Separately, the shares in that table were rounded twice, once
into the bench at four places and once by the component that renders them at one, which
showed the space row's `s` as 7.1 percent where 7.2 is right.

Behind that sat a second failure, found by clicking through the fix rather than by any
check. The corpus URL was `assetUrl("data/tinyshakespeare.txt")`, and the build's base is
`"./"` so the site works from any subpath, which makes the URL relative. A relative URL
inside a web worker resolves against the worker script's own directory, `/assets/`, not
against the page. So the worker fetched `/assets/data/tinyshakespeare.txt`, the static
host answered the miss with the app's own `index.html` and a 200, and the worker wrote
that HTML into `/tinyshakespeare.txt`. With the first fix in and this one still open, the
scratch pad ran happily and reported a vocabulary of 84 characters, a `q` followed 3
times, and a colon most often followed by a slash: the tally of an HTML file, printed
without an error anywhere.

**Why nothing caught it.** The prompts' snippets are the one kind of code in the
repository that nothing ran. `npm run check` builds the app, runs every exercise's tests
against its solution and its skeleton, runs the training panel's Python outside the
browser, and checks the classes, the brand and the palette. A copyable code block was
prose to all of it. The type system had no opinion either, because `dataUrl` was optional
on a request whose only sensible value is the course's one dataset.

**The fix.** The corpus URL is resolved against `document.baseURI` on the main thread,
which is the only side that knows where the page is, and `fetchDataset` refuses a URL
that is not absolute with a message naming the worker-relative trap. `dataUrl` is
required on the scratch-pad request, so the compiler asks for it:
reverting the fix now fails `tsc` with "Property 'dataUrl' is missing ... but required".
The scratch pad sends the corpus URL always, rather than reading it off the current
section. `load_corpus` turns a missing file into a sentence saying the workbench, not the
learner's code, is at fault. Both chapter 1 snippets count the same nine tenths the
chapter counts, so the tally rows now reproduce the chapter's table exactly and the
sampler reproduces its passage and its stuck loop character for character. The bench
stores shares unrounded.

`tools/check_panels.py` grew a second half: it lifts every code block out of every
prompt, runs it against the solved document with the corpus in place, and asserts that
the chapter's own committed values appear in what it printed. Verified by putting the
previous defect back: it reports that the sampler no longer prints `sample.text` or
`favourite_loop.text`.

**Rules:** "Every snippet the course hands the reader is run by a checker, in the
environment the reader runs it in", "A run path that takes the learner's code loads the
course's data unconditionally" and "A URL handed to a worker is absolute", in the
exercises playbook and the runtime rules, plus "Round once, where the number is
displayed" under Numbers.

**Cost:** two lines of runtime wiring, found by the learner rather than by CI, one
exercise into a twelve-chapter course. The checker that makes the class impossible is
90 lines, and it named two further defects on its first run, before it had ever guarded
anything. The second failure cost more than all of them: it needed a real browser, a
real worker and a local copy of the pinned runtime to see at all, because every check in
the repository stands in for the fetch it broke.

## 23. "sometimes it does on the first try but then repeated tries don't work"

**Chapter:** two (transformers), chapter 1, found by the learner the same day as incident
22, on the same button, hours after that fix landed.

**What was wrong.** Send to the scratch pad wrote the appended text to localStorage and
told the panel to open the pad. The panel opened it, scrolled it into view, and never
touched the editor. The editor is a CodeMirror that takes its document once, when it
mounts, so:

- the first send of a session arrived, because it was the thing that mounted the editor,
  and the editor read storage on the way up;
- every send after it stopped at localStorage, with the pad on screen showing the old
  text;
- and the reader's next keystroke ran the editor's onChange, which writes the editor's
  whole document to storage, so the stale copy overwrote the appended snippet and took it
  out of Run the scratch pad as well as out of view.

Measured in a headless Chromium against the built site: two sends, then one keystroke, and
storage fell from 2,139 characters to 1,416. The second snippet was gone from the one place
the reader could still have run it.

The panel had the fix already, ten lines above, for the same reason on the other editor:
"Follow an import or a splice that happened somewhere else. Without this the always-
mounted editor keeps the text it had and the next keystroke writes it back over what was
just loaded." One editor was guarded and its neighbour was not.

A second defect sat behind it, invisible while the first one held: the pad is 180px, about
six lines, and a snippet appended below a pad that already holds one is off screen. So
"sent" needed a scroll as well as a write, which meant the position the text landed at had
to travel with the request rather than a bare counter.

**Why nothing caught it.** No check in the repository mounts an editor. `check_exercises`
runs the Python, `check_panels` runs the prompts' snippets outside the browser,
`check_styles` reads the components' class names, and the build only typechecks. All four
were green through both defects. The failure also needs three interactions in order (open,
send, type) and leaves no trace in any file, so reading the diff would not have shown it
either.

**The fix.** The provider computes the appended text, writes it, and reports where the
snippet landed; the panel pushes that text into the editor with `setDoc` and scrolls to
the offset. Both paths are covered: the pad already open, where the editor exists and gets
the text pushed in, and the pad closed, where the editor mounts holding it and gets
scrolled once its `onReady` fires. A sequence number rather than a timestamp, and a ref
holding the last one applied, so a send is applied exactly once and opening the pad by
hand does not re-scroll the reader.

`tools/check_workbench.mjs` drives the real workbench in headless Chromium, in the dock
and in the phone sheet both: it seeds the pad with 60 filler lines, presses Send twice, and
asserts that no filler line is on screen afterwards, that the top of the pad is the snippet
just sent, and that one keystroke afterwards keeps every snippet. Verified by putting the
defect back: 12 of its 20 cases go red, including the keystroke, which reports
"2139 -> 1416 chars" in each layout.

**Cost:** three files, 57 lines added and 23 replaced, plus a 170-line checker for the
class. Found by the learner, one exercise into the course, on the button that had been
fixed hours earlier. The class is worth naming once: **an always-mounted editor is not the
same object as the storage under it**, and any control that seeds one has to name both.

## 24. "i don't really want you to immediately assume the course is bad and rewrite"

**Chapter:** none. This one is the feedback loop itself, and it is the first entry written
before the failure rather than after it.

**What was wrong.** `/stuck` took a confusion report straight to a rewrite. Its second step
read "Ask me at most two questions if you genuinely cannot tell what I misread. Otherwise
just work", which was written to protect the learner's time and to stop the author being
defensive, and bought both by making the diagnosis unverifiable. Twenty-three fixes shipped
that way. Every one of them was the author's guess about what the learner had misread, and
no fix was ever tested on the reader who reported the confusion: the replacement passage
went in on the author's say-so, and the incident recorded the symptom and the guess.

Three things that loop could not do. It could not tell a misdiagnosis from a good one,
because nothing checked. It threw away the one piece of evidence it did produce, since the
author usually re-explains in chat and then writes the fix from introspection instead of
from the explanation that had just visibly worked. And it could not reach "no change to
this passage" at all: the command's own description was "Fix the passage" and its step
three was "Fix it structurally", so a confusion whose real cause was an earlier chapter, an
unreached panel or one misread word had nowhere to land but the passage the learner had
quoted.

The learner named it while nothing was visibly broken: "if i say i'm confused about
something, i don't really want you to immediately assume the course is bad and rewrite. i
want you to perform a loop of: understand what i'm confused about; re-explain in another
way; confirm i understand what was trying to be taught; if not restart loop; if i
understand, assess the original, your revised method and see what should be updated."

**The fix.** `/stuck` is that loop. Name the suspected misreading, re-explain in chat a
structurally different way, then confirm by making the learner use it rather than by asking
whether it made sense, because a tired reader says yes. Two failed re-explanations are
themselves the finding: the chapter has a structural problem rather than a wording one.
Only then does the chapter change, and what gets ported is what the working explanation
*did* rather than what it said, since chat prose is tuned for one person who has just
described his confusion and chapter prose is read cold, weeks later, by someone with nobody
to ask.

Three guards came with it. Defects skip the loop entirely, because a crash, a wrong number
or a dead control has a known mechanism and nothing to diagnose, and running a teach-back
on incident 22 would have wasted the learner's evening. The learner can say "just fix it"
and short-circuit it. And the working explanation is written down *before* the revision,
because the re-explanation spends the reader as a test subject for that passage: once he
has understood the idea in chat he can never read the new version cold, so the evidence is
always "this explanation worked on a confused reader" and never "the new passage works".

**Rules:** rule zero's second half, "a fix that was never checked against the confused
reader is a guess", and `METHOD.md` phase 3, which now states the loop as the process
rather than as one line about fixing the passage.

**Cost:** none yet, and that is the entry's point. Every other incident here was paid for
in a rewrite, a retrofit or a reader who stopped; this one was caught by the learner
watching his own feedback loop and asking for a different one before it produced a bad fix.
It is the cheapest incident in the file, and the only one whose cost is unknown, because
nobody can now say which of the twenty-three fixes above would have survived the check.

## 25. "seems we made an unexplained leap here"

**Chapter:** two (transformers), chapter 2, section 1, found by the learner on his first
read. The first incident diagnosed through the `/stuck` loop rather than by guess.

**What was wrong.** The learner stopped on the closing paragraph of "What counts as one
move": "i follow most of it but had to reread 2-3 times. last paragraph i don't
understand." The paragraph was:

> Characters have their own bill, and it comes due in chapter 5. A model reads a fixed
> number of tokens at a time, so the shorter the token the less text that fixed number
> covers. A word in this corpus is 5.50 characters long counting the space after it, so
> the scribe's window of 32 characters holds about 5.8 words. That is this chapter's
> tally, and it is not measured in bits like every other chapter's: a vocabulary of 65
> rows, against a window that reaches back under six words.

**What the misunderstanding turned out to be**, and it took two re-explanations to reach,
neither of which was the author's first diagnosis:

The author's first guess was undefined terms: window, T, the scribe's 32, all of which
arrive in later sections. True, and not the cause. The second guess was closer, a switch
of frame from counting the corpus to what one model sees at one moment, made with no
signpost while the reader still held the corpus counts from the table above. That
re-explanation landed, and the learner passed the check on it. But his answer carried the
real finding, which neither guess had touched:

> "ok so last chapter we were talking about generating the next character based on only
> the previous character... are we now talking about generating the next token based on
> more than 1 previous token? seems we made an unexplained leap here"

Chapter 1 spends its last section teaching that the model's memory is exactly one
character and that everything earlier is thrown away. Chapter 2 then assumed a model reads
several tokens at once, in a subordinate clause, inside a paragraph about the cost of
characters, and never marked it as new. The single largest conceptual step in the first
half of the course arrived as a premise.

**Which re-explanation landed.** The one that separated the data's shape from the model's
capability: a window offers each position everything to its left, chapter 4's model still
reads only the last character, chapter 5 is the first to look further back, and chapter 9
uses the whole window. So chapter 2 is not claiming a capability at all. It is building
the pipeline every later chapter is fed from, and the data changes shape six chapters
before the model finishes growing into it.

**The fix.** Section 1 loses the paragraph. In its place it states the one cost it can
state honestly with only chapter 1 in hand, and does it in the frame the section is
already in: the tokens column of its own table. The same play is 5.5 times as many tokens
read as characters, every token is one turn of chapter 1's game, so a line of dialogue
takes 28 guesses where a word model would take 5.

Section 4 gains the mark. It opens on chapter 1's one-character memory, says the change
happens in the data before the model, and after the slicer spends a paragraph on what a
model does with the offer, chapter by chapter. The reach cost moves there, where a window
is on screen to measure it against, and the recap carries the leap as its own item.

Three smaller things fell out of the same read. "That is this chapter's tally" reused the
name of chapter 1's counts table for the cost being tallied, which is the reserved-word
rule broken by the author who wrote it. "Six times less text", carried from the author's
own chat explanation into the draft, was wrong: the ratio is 5.5, the same one the rest of
the chapter quotes. And the fix's own new number, "a line of this corpus averages 28
characters", was measured over every newline segment, 7,223 of which are blank and 7,222
of which are speaker names, with the file's trailing newline inventing a 40,001st line
that is not there. A review bot caught that one. A spoken line averages 39 characters, so
the scribe's window does not reach the end of one, which is a sharper statement than the
wrong number was making. **A unit invented to make a number concrete has to be measured
as the thing it is named after**; "line of dialogue" and "newline segment" are not the
same object in a file that is 36 percent blank lines and speaker names.

The sweep the loop ends with turned up one more of the same kind, in the same chapter:
**the scribe had never been introduced to the reader.** It is the course's central
recurring artifact, the model built one piece per chapter, and chapter 1 does not use the
word once while chapter 2 used it four times as though it were established. The only place
a reader could have met it was the download button's filename. Chapter 2 now names it at
its first use, and it has a row in the notation reference.

**Rules:** "When a chapter takes back a limit an earlier chapter taught, say so at the
point it happens", under Backward references. Plus one on the loop itself, in step 3 of
`/stuck`: the check may only use what the learner has already read. The author's first
check asked him to reason about chapter 4, which is a stub with no prose in it: "why are
you asking me about chapter 4?? it's not even built and i only just started to read c2".
That is the same defect as the passage under diagnosis, asked of someone already lost.

**Cost:** one section rewritten and one restructured, two bench figures added, on a
chapter that had shipped four hours earlier. Cheap, and the loop is why: the passage the
learner pointed at was a symptom, and the change that mattered is in a different section
of the chapter. The old loop would have rewritten the paragraph he quoted, and the leap
would still be unexplained.

## 26. "the annoying writing style which sells you somehting before it proves it's use"

**Chapter:** two (transformers), chapter 2, section 1, on the reader's second pass at the
section that incident 25 had already rewritten once.

**What was wrong.** The section priced characters against words across four costs, one
paragraph each, and every paragraph opened by naming the cost before showing it: "The
distinct count is what the second row costs", "Two more costs come with words, and both of
them are about rarity", "Characters have their own cost, and the tokens column already
holds it". The learner read it and said it "is littered with the annoying writing style
which sells you somehting before it proves it's use", then asked the question that was the
fix: "is there a succinct picture that can be drawn instead of all the words?"

`CLAUDE.md` already said "Motivate with numbers, not verdicts. Let the tally be the drama."
The rule was not missing. It was broken three paragraphs in a row by the author who wrote
it, in a section that had just been rewritten under close attention, which is the useful
part of this incident: a register rule survives one careful pass and dies on the next,
because nothing in the pre-commit list can see it.

Two number defects came in the same message and were both real. "A word is 5.50 characters
long counting the space after it" states of every word what is true of the mean: "you mean
the average word?" And a spoken line's 39 characters and 8 words appeared in prose with no
provenance anywhere on the page, neither in the table above nor derived beside them: "where
the heck did 39 come from? and 8?" That is the same defect incident 25 had already cost a
round on, one section over.

**The fix.** Four paragraphs and the two-column table above them became one six-row table:
tokens, distinct tokens, cells in the tally, seen exactly once, guesses per spoken line,
and whether the model can write a token it has never seen. The comparison is two options
over six counts, which is a table and was never prose. Every number the prose had asserted
is now a row, the averages are stated as averages in the caption, and 39 and 8 arrive with
their derivation beside them. The three paragraphs that remain read rows rather than
announce them, and the section lost about a hundred words.

**No countable came out of this one, and that is worth recording so the next session does
not spend the attempt.** The obvious proxy for selling-before-proving is a paragraph whose
first sentence carries no number while a later one does. Measured: 13 of 26 paragraphs in
chapter 1, which the learner read and called good, against 16 of 34 in the chapter he
stopped on. Fifty percent against forty-seven. The proxy cannot see the difference, because
what separates "The distinct count is what the second row costs" from "One line makes a
poor guesser, so give it more text" is whether the opener labels evidence about to arrive
or states a fact that moves the story, and only a reader can tell. The rule stays in
`CLAUDE.md` with the tell described and the failed measurement attached.

**Rules:** "A comparison is a table, not a run of paragraphs", under Reaching the reader,
and the tell added to "Motivate with numbers, not verdicts" under Register.

**Cost:** one section rebuilt for the second time in a day, plus a bench field. The
section had already been through the `/stuck` loop once, for incident 25, and came out of
it with the leap fixed and the register untouched, because the loop diagnoses what the
reader could not follow and this reader could follow it perfectly well. **A confusion loop
does not catch prose that works and grates.** That needs the reader to say so, which is a
second kind of report and arrives only if the course is being read rather than reviewed.

## 27. "is there a point to these 2 paragraphs"

**Chapter:** two (transformers), chapter 2, section 3, the crossing between text and
numbers, read after the section 1 rebuild of incident 26 had merged.

**What was wrong.** Two paragraphs closed the section, and the learner asked the question
in the title, in full: "is there a point to these 2 paragraphs besides saying that mapping
string to int to string gives back the original string? and then just defining tokenizer?"
The answer was no, for two different reasons, each already covered by a rule.

The first paragraph reported the encode-decode round trip passing on all 1,115,394
characters and stopped. `CLAUDE.md` said "Checks without stated stakes read as arithmetic
for its own sake", and this check cannot fail on the chapter's own data, so it read as
exactly that. Its one stake, that a character the vocabulary does not contain has no id
and `encode` stops at it, was the sentence the paragraph did not have.

The second was the handover from this course's word (the crossing) to the field's word
(tokenizer), which the playbook asks for at the first use of the thing. Two of its four
sentences did that job. The other two announced how the course would use the two words
from here on ("the crossing when the point is what the functions do, a tokenizer when the
point is which component they are"), which is the course narrating its own usage policy.
The sweep found the same clause at chapter 1's handover of tally to bigram counts: "both
words are in play from here on".

**No loop ran, and none was owed.** The learner understood both paragraphs and asked
whether they earned their place; that is a craft report with nothing to diagnose, like
incident 26, and unlike incidents 24 and 25.

**The fix.** The round-trip paragraph says what the check proves and the two things it is
silent on, and hands the check to the exercise in one sentence. The
handover names the field's word, scopes it in one sentence, and stops. Chapter 1's clause
was cut. Net, the section lost about forty words and gained the only sentence that gave the
check a point.

**Corrected once before merge, by a review bot.** The first draft of the round-trip
paragraph gave the check "one way to fail", a character the vocabulary does not contain.
As the exercise runs it, that cannot happen: `build_vocab` measures the vocabulary from
the same text `encode` is then handed. What the check does catch is an implementation
error, a character stripped or added by `decode` or two lookups built in different orders,
which is what `test_decode_round_trip` tests for. So the fix for a check with no stakes
had invented a stake the check could not reach, and the rule now says the failure named
must be one the check as run can reach.

**And corrected twice.** The second draft said the check "catches what an implementation
gets wrong", and the same bot pointed out that a `build_vocab` numbering characters in
first-seen order, with both lookups built consistently from that order, passes the round
trip untouched; `test_sorted_not_first_seen` exists because of exactly that. The check
proves one property, that `decode` undoes `encode`, and a mistake that preserves the
property passes. The paragraph now scopes its claim to that property and names both
blind spots, the unsorted numbering and the uncovered character. Two corrections on one
sentence is the cost of writing a check's coverage from what it is for instead of from
what it compares.

**Rules:** the check-that-cannot-fail clause under "State what a section buys before
proving it", with the reachability clause from the correction, and "Name the field's word
and stop" under the handover rule.

**Cost:** two paragraphs and one clause, in one commit. The pattern to watch is the
second one: the handover rule in `CLAUDE.md` describes the state after the handover ("both
words are in play"), and the author turned that description into a sentence of prose,
twice. A rule that describes an outcome will get transcribed into the page unless it also
says not to.

## The pattern behind course one's eighteen

Four of them (2, 6, 7, 12) are the same chapter, and it is the one chapter authored outside
the playbook, in a single 25-file commit that also touched the stylesheet, the app shell and
the runtime. Two regressions landed in that commit as well, in files nobody was reviewing
for UI.

That chapter also had, at birth, every structural component the conventions required:
section headers, the on-this-page nav, an aside box, a recap. **Structural conformance is
not playbook conformance.** A chapter can carry every component and still fail the reader
completely.

Three others (14, 17, 18) are the end of the course, and all three were found by a reader
who had finished it rather than by a review of a chapter. Two of them are the first fix
failing: the closing chapters of incident 14 were the right chapters, and both of the
things they were asked to carry were wrong on them. The vocabulary table belonged in the
chapters that earned the words, and the reading list on whichever page is last. **The
ending is the least reviewed part of a course**, because it is written last, by an author
who has read every earlier chapter too recently to skim anything.
