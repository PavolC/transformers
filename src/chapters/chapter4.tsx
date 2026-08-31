// Chapter 4, day-one form: a stub page hosting the pipeline's guinea-pig
// exercise (softmax), so the whole loop (editor, worker, tests, results,
// hints, persistence) runs against something real. The chapter's prose,
// interactives and remaining exercises are written at M3 per the design doc;
// this page says so plainly rather than pretending to teach.

import { useEffect, useState } from "react";
import { softmaxExercise } from "../exercises/softmax";
import { ExerciseCard } from "../components/ExerciseCard";

export function Chapter4() {
  const [exercise] = useState(() => softmaxExercise);
  useEffect(() => {
    document.title = "The learned tally · Transformers · Moving Parts";
  }, []);
  return (
    <article className="module">
      <header className="module-header">
        <p className="module-kicker">Chapter 4</p>
        <h2>The learned tally</h2>
        <p className="module-lede">
          This chapter is being written. Its first exercise is already live below, because
          the course's exercise pipeline was built against it: softmax is the machine that
          turns a row of scores into a guess list, and the course reuses it from here to
          the last chapter.
        </p>
      </header>
      <ExerciseCard exercise={exercise} />
    </article>
  );
}
