import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// The built site carries the license text, because it carries the code the
// license is about: every solution.py is imported ?raw into the bundle, and
// the LICENSE covers that code (MIT) and the prose (CC BY 4.0). Copying at
// build time rather than keeping a second copy in public/ is what stops the
// two from drifting.
function licenseInBuild(): Plugin {
  return {
    name: "license-in-build",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "LICENSE.txt",
        source: readFileSync(new URL("./LICENSE", import.meta.url), "utf8"),
      });
    },
  };
}

// base is relative so the static build works from any subpath (e.g. GitHub Pages).
export default defineConfig({
  base: "./",
  plugins: [react(), licenseInBuild()],
  // The dev server always answers on 5175 (course one owns 5174, and pinning
  // both lets the two courses run side by side). strictPort makes a busy port
  // a startup error instead of a silent hop: a drifting port is how you end
  // up reloading an address that nothing is serving. PORT still wins, so a
  // preview harness can assign one.
  server: { port: Number(process.env.PORT) || 5175, strictPort: true },
});
