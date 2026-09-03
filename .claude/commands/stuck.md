---
description: I got lost reading a chapter. Diagnose it with me, then fix the passage and leave a rule behind.
---

I stopped here: $ARGUMENTS

This is a comprehension bug report, not a style note. Treat my words as the evidence.

**Do not edit the chapter yet.** A confusion report is a symptom, and the diagnosis is the
thing you do not have. Every fix in `CASEBOOK.md` before this rule was your guess about
what I misread, and nothing ever checked that guess against me. The re-explanation below
costs one message, and it is the only test available while a real reader is still in the
room.

First, is this a confusion or a defect? A defect has a known mechanism and no diagnosis to
find: a crash, a wrong number, a control that does nothing, a chapter missing from the
navigation. Fix those directly and skip to step 5. Everything else runs the loop.

1. **Name what you think I misread**, in one or two sentences, and say which playbook rule
   the passage broke, or say honestly that no existing rule covers it. Do not defend the
   passage and do not reword it. Ask me one question only if you genuinely cannot tell what
   I misread.
2. **Re-explain it here, in chat, a different way.** Different means structurally
   different: another order, a concrete instance first, the misconception named out loud,
   a prerequisite the chapter assumed I had. The same explanation slower, or with more
   words, is not a second attempt.
   When the report is "I don't know X", the re-explanation cannot be written in X. Three
   NumPy moves offered to "i don't yet know numpy so how am i supposed to understand
   this?" was a first attempt wasted; the second used the reader's own pasted function
   and changed two lines of it. Start from what I wrote, not from what I am missing.
   When the confusion is a formula, run from the goal to the formula on the smallest
   numbers that show the mechanism, and name nothing until it has been shown. "go slower
   and reexplain" is not a failed attempt; it is a request for exactly that order. The
   version that landed chapter 3's score had eight numbered steps, four made-up
   probabilities and no metaphor, and it is what the page was rebuilt from.
   When the report is "dense" or "hard to follow" from someone who thinks he has the
   idea, there is no misconception to find, and more prose is the wrong instrument: draw
   it. A picture is a structurally different re-explanation, and "show me the minimum
   number of pictures right here that explain what you just did" is the check that
   decides whether the chapter needs one. The two pictures that answered it for chapter
   3's score became the section's two figures.
3. **Check that it landed by making me use it.** Never "does that make sense?", which a
   tired reader answers yes to. Ask me to predict a number, to apply it to a case you did
   not use, or to say what would break if a piece changed. That is this course's own
   prediction-against-a-log rule, pointed at the feedback loop.
   **The check may only use what I have already read.** A question that leans on a later
   chapter, or on one that is not written yet, is the same defect as the passage you are
   trying to diagnose, and you are asking it of someone who is already lost: "why are you
   asking me about chapter 4?? it's not even built and i only just started to read c2".
   Already read means up to the sentence I stopped on, not the page: an interactive two
   paragraphs below the passage is unread, and a check that says "drag the slider" lands
   on someone who "hasn't made it to the interactive element yet". Use the text I quoted,
   or a line from an earlier chapter.
   - I used it correctly: go to 4.
   - I did not: back to 1, with what my answer just told you.
   - Twice failed: stop looping. Two dead re-explanations mean the chapter has a
     structural problem rather than a wording one, and that is the finding. Say so, and
     treat the restructure as the fix.
4. **Write the explanation that worked down before you revise anything.** Once I have
   understood it from chat I can never read the revision cold, so what you hold is
   evidence about an explanation rather than evidence about a passage. Capture it while it
   is still uncontaminated by your rewrite.
5. **Fix the chapter, structurally.** The fixes that worked in course one were
   reorderings, figures and worked examples, not adjectives: move the interactive earlier,
   log the numbers first, draw the thing, pick an example where the mechanism is visible,
   name the pattern and sort the instances into kinds.

   What briefs that fix depends on how you got here, and there are three doors:
   - **Through the loop.** The diff is the brief. Ask what the explanation that worked
     *did* that the chapter did not, and port that mechanism rather than those words: chat
     prose is tuned for one person who has just said what confused him, and chapter prose
     is read cold, weeks later, by someone with nobody to ask.
   - **Through the twice-failed branch.** There is no working explanation to diff, but two
     dead attempts are evidence: what neither of them could get across, in the space the
     chapter gives it, is the thing the chapter has to be rebuilt around. Say what that is
     before you rebuild.
   - **Through a defect, or through "just fix it".** You have no diagnosis at all, and you
     must not invent one to fill the shape of the other two doors. Fix the mechanism you
     can point at: the crash, the wrong number, the passage I named. Then say in the commit
     that the fix went in unchecked, because a fix with no diagnosis behind it is exactly
     the guess rule zero warns about, and the casebook entry has to record that rather
     than dress it up as a diagnosis.

   **"No change to this passage" is a real answer**, through any of the three doors. The
   confusion may belong to an earlier chapter, to a panel I never reached, or to one word
   I read differently than you meant it. Fix it where it lives, and say that is what you
   did.
6. **Then generalize, in the same commit:**
   - a rule in `CLAUDE.md`, imperative, one or two sentences, in my words where they are
     better than yours;
   - the incident in `CASEBOOK.md`: my quote, the fix, the cost, and, when the loop ran,
     **what the misunderstanding turned out to be** and **which re-explanation landed**.
     When it did not run, the entry says that instead of guessing at either;
   - a `[casebook: N]` pointer from the rule to the incident.
7. **Then sweep.** The same bug is almost never in one place. Check every other chapter for
   it and say what you found, even if you do not fix it all now.

If I say "just fix it", skip the loop and go to step 5.

A fix that does not leave a rule behind will be re-learned. A fix that was never checked
against me is a guess.
