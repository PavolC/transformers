// Drives the real workbench in a real browser, which is the only place some
// of it exists. Every other check in this repository stands in for the
// browser: check_exercises runs the Python, check_panels runs the prompts'
// snippets, check_styles reads the components. None of them mounts an editor,
// so a control that hands the learner's workspace a piece of code was checked
// by nobody (casebook 22 cost one of those, casebook 23 the next).
//
// Scope: the path from a prompt's Send to the scratch pad button to the code
// being in front of the reader, in both layouts, because the panel is a dock
// beside the prose above 1360px and a modal sheet over it below. Add a case
// here whenever a control writes into the workbench.
//
// Needs playwright-core and a Chromium, neither of which this repo depends on,
// so it stays out of `npm run check` and runs by hand:
//
//   npm run build
//   (cd dist && python3 -m http.server 8199)
//   npm i --no-save playwright-core
//   CHROMIUM_BIN=<chromium> node tools/check_workbench.mjs
//
// URL overrides the address (default http://127.0.0.1:8199/#c1).
import { chromium } from "playwright-core";

const URL = process.env.URL ?? "http://127.0.0.1:8199/#c1";
const BIN = process.env.CHROMIUM_BIN;
if (!BIN) {
  console.error("Set CHROMIUM_BIN to a Chromium executable (see the header).");
  process.exit(2);
}

// The pad is seeded with filler so "did it scroll to the new snippet" has an
// unambiguous answer: no filler line may be on screen afterwards. The pad is
// 180px, about six lines, and a snippet appended below the six the reader can
// see is code they were not sent.
const FILLER = Array.from({ length: 60 }, (_, i) => `# filler ${String(i).padStart(3, "0")}`).join(
  "\n",
);

const LAYOUTS = [
  { name: "dock ", viewport: { width: 1440, height: 900 } },
  { name: "sheet", viewport: { width: 375, height: 812 } },
];

const browser = await chromium.launch({ executablePath: BIN, headless: true });
const fails = [];

for (const layout of LAYOUTS) {
  const page = await browser.newPage({ viewport: layout.viewport });
  const check = (name, ok, detail) => {
    console.log(`${ok ? "ok  " : "FAIL"}  ${layout.name}  ${name}${detail ? `   ${detail}` : ""}`);
    if (!ok) fails.push(`${layout.name} ${name}`);
  };
  page.on("pageerror", (e) => check("no page error", false, String(e).slice(0, 200)));

  await page.goto(URL, { waitUntil: "load" });
  await page.waitForSelector(".play-snippet", { timeout: 20000 });
  await page.evaluate((filler) => localStorage.setItem("tf:v1:code:scratch", filler), FILLER);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".play-snippet", { timeout: 20000 });

  /** What the reader can see of the pad, and what is stored under it. */
  const view = () =>
    page.evaluate(() => {
      const sc = document.querySelector(".wb-scratch-editor .cm-scroller");
      const stored = localStorage.getItem("tf:v1:code:scratch") ?? "";
      if (!sc) return { stored, mounted: false };
      const box = sc.getBoundingClientRect();
      const visible = [...sc.querySelectorAll(".cm-line")]
        .filter((line) => {
          const b = line.getBoundingClientRect();
          return b.bottom > box.top + 1 && b.top < box.bottom - 1;
        })
        .map((line) => line.textContent);
      return {
        stored,
        mounted: true,
        open: !!document.querySelector(".wb-scratch")?.open,
        scrollTop: Math.round(sc.scrollTop),
        maxScroll: sc.scrollHeight - sc.clientHeight,
        visible,
      };
    });

  // The sheet is modal, so a reader on a phone closes the panel to reach the
  // next prompt. The dock is not, and is left open on purpose: a send into a
  // pad that is already on screen is the case that was broken.
  const send = async (i) => {
    if (await page.locator('.wb[data-dock="sheet"]').count()) {
      await page.locator(".wb-close").click();
      await page.waitForTimeout(300);
    }
    await page.locator(".play-snippet").nth(i).locator("button").nth(1).click();
    await page.waitForTimeout(900);
  };
  // The prompts' own code, read off the page rather than named here, so this
  // suite runs against any chapter that carries these buttons: chapter 2 has
  // two of them too, and the first version of this file asserted on chapter
  // 1's identifiers, so pointing URL at #c2 failed on the prose rather than
  // on the app. A snippet's first line is what the pad should be scrolled to
  // and its last line is what proves the whole snippet arrived.
  const snippets = await page.locator(".play-snippet pre").allTextContents();
  if (snippets.length < 2) {
    check(`${URL} carries two prompt snippets`, false, `found ${snippets.length}`);
    await page.close();
    continue;
  }
  const firstLine = (i) => snippets[i].trimStart().split("\n")[0].trim();
  const lastLine = (i) => snippets[i].trimEnd().split("\n").pop().trim();

  const noFiller = (v) => !v.visible.some((line) => line.includes("# filler"));
  const atSnippetTop = (v, i) => v.visible.some((line) => line.trim() === firstLine(i));
  const bothArrived = (v) => v.stored.includes(lastLine(0)) && v.stored.includes(lastLine(1));

  check("the pad starts closed, over 60 filler lines", (await view()).mounted === false);

  // The first send. The pad is closed, so the editor mounts with the appended
  // text already in it and has to be scrolled to the foot of the filler.
  await send(0);
  const a = await view();
  check("the first send opens the pad", a.open === true);
  check("it scrolls past the filler", noFiller(a) && a.scrollTop > 0, `scrollTop ${a.scrollTop}`);
  check("to the snippet just sent", atSnippetTop(a, 0), JSON.stringify(a.visible.slice(0, 2)));

  // The second send, into a pad that is already open. This is the one that was
  // broken: it wrote localStorage and stopped there, because the editor owns
  // its own copy of the document.
  await send(1);
  const b = await view();
  check(
    "the second send reaches the editor too",
    noFiller(b) && atSnippetTop(b, 1) && b.scrollTop > a.scrollTop,
    `scrollTop ${a.scrollTop} -> ${b.scrollTop} of ${b.maxScroll}`,
  );
  check("both snippets are in the pad", bothArrived(b));

  // One keystroke, typed where the caret already is. No mouse: a click inside
  // a scrolling contenteditable can leave a selection behind, and then the
  // keystroke replaces it, which fails this check for a reason that is the
  // harness rather than the app. A stale editor used to write its own copy
  // back here, taking the snippet out of Run the scratch pad as well as out
  // of view.
  const storedBefore = b.stored;
  await page.locator(".wb-scratch-editor .cm-content").focus();
  await page.keyboard.type("#");
  await page.waitForTimeout(400);
  const c = await view();
  check(
    "the next keystroke keeps every snippet",
    c.stored.length === storedBefore.length + 1 &&
      bothArrived(c) &&
      c.stored.includes("# filler 059"),
    `${storedBefore.length} -> ${c.stored.length} chars`,
  );

  // Pressing the same button twice is two sends, not one.
  await send(1);
  const d = await view();
  check(
    "the same snippet sends twice",
    d.stored.length > c.stored.length && d.scrollTop > b.scrollTop,
    `${c.stored.length} -> ${d.stored.length} chars, scrollTop ${d.scrollTop}`,
  );

  // Collapsed by hand, then sent to: the editor unmounts with the pad, so this
  // is the mount path again, on a pad that already holds two snippets.
  await page.locator(".wb-scratch > summary").click();
  await page.waitForTimeout(300);
  check("the pad collapses", (await view()).mounted === false);
  await send(0);
  const e = await view();
  check(
    "a send into a collapsed pad reopens it, scrolled to the snippet",
    e.open === true && noFiller(e) && atSnippetTop(e, 0) && e.scrollTop > 0,
    `scrollTop ${e.scrollTop} of ${e.maxScroll}`,
  );

  await page.close();
}

await browser.close();
console.log(fails.length ? `\n${fails.length} failed` : "\nall green");
process.exit(fails.length ? 1 : 0);
