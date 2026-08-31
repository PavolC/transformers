import { useEffect, useState } from "react";

/** True once the element has been near the viewport, and true forever after.
 *
 * Used to keep work off the first paint. Every module renders into one long
 * document, so anything that fetches or imports on mount would otherwise do it
 * while the reader is still on the first paragraph: the MNIST subset for
 * Module 2's interactives, and CodeMirror for the exercises. The margin starts
 * the work before the element is actually visible, so arriving at it does not
 * mean waiting for it.
 *
 * The timer is not redundant with the observer. An IntersectionObserver that
 * exists but never delivers a callback is a real state (some embedded and
 * automated browsers do exactly this), and without a fallback it would leave an
 * interactive reading "Loading a digit..." forever and an exercise whose run
 * buttons never enable. Failing towards "loads a few seconds later" is much
 * better than failing towards "never loads", and it costs nothing when the
 * observer works, because by then `seen` is already true. */
export function useInViewOnce(
  ref: React.RefObject<Element | null>,
  fallbackMs = 4000,
): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const timer = window.setTimeout(() => setSeen(true), fallbackMs);
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { rootMargin: "600px" },
    );
    obs.observe(el);
    return () => {
      window.clearTimeout(timer);
      obs.disconnect();
    };
  }, [ref, seen, fallbackMs]);
  return seen;
}
