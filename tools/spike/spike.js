// The spike's driver. Loads the pinned Pyodide, the reference scribe, and the
// corpus; measures boot, then trains inside the wall-clock budget, logging a
// tick every 10 steps and a quick held-out check every 50. The final JSON
// lands on window.__spikeResult for tools/spike/measure.mjs to collect.

const qs = new URLSearchParams(location.search);
const num = (k, d) => Number(qs.get(k) ?? d);
const cfg = {
  block_size: num("T", 64),
  n_embd: num("C", 64),
  n_head: num("H", 4),
  n_layer: num("L", 2),
  batch_size: num("B", 16),
};
const lr = num("lr", 2e-3);
const budget = num("budget", 90);
const dist = qs.get("dist") ?? "https://cdn.jsdelivr.net/pyodide/v314.0.5/full/";

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const log = (line) => {
  logEl.textContent += line + "\n";
};

const DRIVER = `
import json, time
import numpy as np
import reference_scribe as rs

def spike_run(text, cfg_json, budget_s, lr, on_tick):
    cfg = json.loads(cfg_json)
    chars, stoi, itos = rs.build_vocab(text)
    cfg["vocab_size"] = len(chars)
    ids = rs.encode(text, stoi)
    train_ids, val_ids = rs.split_data(ids)
    counts = rs.bigram_counts(train_ids, len(chars))
    rung = rs.bigram_avg_surprise_bits(rs.bigram_probs(counts), val_ids)

    rng = np.random.default_rng(1337)
    params = rs.init_params(cfg, rng)
    n_params = int(sum(p.size for p in params.values()))
    state = rs.adamw_init(params)

    t0 = time.time()
    step = 0
    crossed_at = None
    ticks = []
    while time.time() - t0 < budget_s:
        step += 1
        x, y = rs.get_batch(train_ids, cfg["block_size"], cfg["batch_size"], rng)
        loss, grads = rs.loss_and_grads(params, x, y, cfg)
        rs.adamw_step(params, grads, state, step, lr=lr)
        if step % 50 == 0:
            quick = rs.eval_loss_bits(params, val_ids, cfg, np.random.default_rng(99), batches=4)
            if crossed_at is None and quick < rung:
                crossed_at = {"step": step, "seconds": round(time.time() - t0, 1), "val_bits": round(quick, 4)}
        if step % 10 == 0:
            el = time.time() - t0
            tick = {
                "step": step,
                "train_bits": round(float(loss), 4),
                "seconds": round(el, 1),
                "tokens_per_s": round(step * cfg["batch_size"] * cfg["block_size"] / el),
            }
            ticks.append(tick)
            on_tick(json.dumps(tick))
    elapsed = time.time() - t0
    val_bits = rs.eval_loss_bits(params, val_ids, cfg, np.random.default_rng(99))
    sample = rs.decode(
        rs.generate(params, cfg, rs.encode("\\n", stoi), 250, np.random.default_rng(5), temperature=0.8),
        itos,
    )
    return json.dumps({
        "cfg": cfg, "lr": lr, "budget_s": budget_s,
        "n_params": n_params, "vocab": len(chars),
        "bigram_rung_bits": round(rung, 4),
        "steps": step,
        "steps_per_s": round(step / elapsed, 2),
        "tokens_per_s": round(step * cfg["batch_size"] * cfg["block_size"] / elapsed),
        "crossed_rung": crossed_at,
        "final_val_bits": round(val_bits, 4),
        "sample": sample,
        "ticks": ticks,
    })
`;

async function main() {
  const t0 = performance.now();
  statusEl.textContent = `loading pyodide from ${dist}`;
  const { loadPyodide } = await import(/* @vite-ignore */ `${dist}pyodide.mjs`);
  const py = await loadPyodide({ indexURL: dist });
  await py.loadPackage("numpy");
  const bootS = (performance.now() - t0) / 1000;
  log(`boot (pyodide + numpy): ${bootS.toFixed(1)}s`);

  const scribeSrc = await (await fetch("../../src/python/reference_scribe.py")).text();
  const text = await (await fetch("../../public/data/tinyshakespeare.txt")).text();
  py.FS.writeFile("/reference_scribe.py", new TextEncoder().encode(scribeSrc));
  await py.runPythonAsync("import sys; sys.path.insert(0, '/')");
  await py.runPythonAsync(DRIVER);

  statusEl.textContent = `training: T=${cfg.block_size} C=${cfg.n_embd} H=${cfg.n_head} L=${cfg.n_layer} B=${cfg.batch_size} lr=${lr} budget=${budget}s`;
  py.globals.set("_text", text);
  py.globals.set("_cfg_json", JSON.stringify(cfg));
  py.globals.set("_on_tick", (t) => log(t));
  const resultJson = await py.runPythonAsync(`spike_run(_text, _cfg_json, ${budget}, ${lr}, _on_tick)`);
  const result = JSON.parse(resultJson);
  result.boot_s = Math.round(bootS * 10) / 10;
  log("RESULT " + JSON.stringify(result, null, 1));
  statusEl.textContent = "done";
  window.__spikeResult = result;
}

main().catch((err) => {
  statusEl.textContent = "failed";
  log("ERROR " + (err?.stack || String(err)));
  window.__spikeResult = { error: String(err) };
});
