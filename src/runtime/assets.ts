// Main-thread asset loading: the corpus, for interactives that read it
// directly (the tally builder, the vocabulary strip). The worker fetches its
// own copy through fetchDataset; this one is for JS that never touches
// Python.

const base = import.meta.env.BASE_URL ?? "./";

export function assetUrl(path: string): string {
  return `${base}${path}`;
}

/** The corpus's URL, for handing to the worker as a dataUrl, resolved here
 * against the page rather than left relative. The build's base is "./" so the
 * site works from any subpath, and a relative URL inside a worker resolves
 * against the worker script's own directory (/assets/), not the page's: the
 * fetch then lands on the SPA fallback and writes index.html into
 * /tinyshakespeare.txt, where it reads as an 84-character vocabulary of HTML.
 * The main thread is the only side that knows where the page is. */
export const CORPUS_URL = new URL(
  assetUrl("data/tinyshakespeare.txt"),
  document.baseURI,
).href;

async function fetchMaybeGz(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`failed to fetch ${url}: HTTP ${resp.status}`);
  let bytes = new Uint8Array(await resp.arrayBuffer());
  // Vite's dev server serves .gz with Content-Encoding: gzip (already
  // decompressed); a static host may serve raw bytes. Check the magic.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return bytes;
}

let corpusPromise: Promise<string> | null = null;

/** The whole of Tiny Shakespeare, fetched once and shared. */
export function loadCorpus(): Promise<string> {
  corpusPromise ??= fetchMaybeGz(CORPUS_URL).then((bytes) => new TextDecoder().decode(bytes));
  return corpusPromise;
}
