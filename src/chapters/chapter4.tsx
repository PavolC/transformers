// Chapter 4, day-one form: a stub page hosting the pipeline's guinea-pig
// exercise (softmax), so the whole loop (editor, worker, tests, results,
// hints, persistence) runs against something real. The chapter's prose,
// interactives and remaining exercises are written at M3 per the design doc;
// this page says so plainly rather than pretending to teach.
//
// Structure note: the heading and every paragraph are DIRECT children of
// article.module, because that is what the stylesheet's measure rules select
// (.module > p). Wrapping them in a header element silently opts the prose
// out of the reading measure and it runs 844px wide against the column's
// 646px, which reads as a misalignment rather than as a wider header.

import { useEffect } from "react";
import { softmaxExercise } from "../exercises/softmax";
import { ExerciseCard } from "../components/ExerciseCard";

export function Chapter4() {
  useEffect(() => {
    document.title = "The learned tally · Transformers · Moving Parts";
  }, []);
  return (
    <article className="module">
      <h2>Chapter 4: The learned tally</h2>
      <p>
        This chapter is being written. Its first exercise is already live below, because
        the course's exercise pipeline was built against it: softmax is the machine that
        turns a row of scores into a guess list, and the course reuses it from here to the
        last chapter.
      </p>
      <ExerciseCard exercise={softmaxExercise} />
    </article>
  );
}
