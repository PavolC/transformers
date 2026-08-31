// Drive the spike page in headless Chromium and print its result JSON.
// Needs playwright-core (npm i -D playwright-core) and a Chromium binary.
//
//   node tools/spike/measure.mjs --url "http://127.0.0.1:8123/repo/tools/spike/index.html?dist=...&T=64" \
//     [--exe /path/to/chrome] [--timeout 300]
//
// The page sets window.__spikeResult when it finishes; this script waits for
// it, relays the page's console while it waits, and exits nonzero if the page
// reports an error, so a wrapper can sweep configurations.

import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const get = (flag, d) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : d;
};
const url = get("--url");
if (!url) {
  console.error("usage: node tools/spike/measure.mjs --url <spike page url> [--exe <chromium>] [--timeout <s>]");
  process.exit(2);
}
const exe = get("--exe", process.env.CHROMIUM_BIN);
const timeoutS = Number(get("--timeout", 300));

const browser = await chromium.launch({
  executablePath: exe,
  args: ["--no-proxy-server"],
});
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.error("[page]", msg.text());
});
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__spikeResult !== undefined, null, {
  timeout: timeoutS * 1000,
  polling: 1000,
});
const result = await page.evaluate(() => window.__spikeResult);
await browser.close();
console.log(JSON.stringify(result, null, 1));
process.exit(result && result.error ? 1 : 0);
