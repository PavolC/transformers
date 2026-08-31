// Raw localStorage access, one place, so nothing else has to remember the
// prefixes or the try/catch.
//
// Three prefixes, and the difference between them is load-bearing:
//
//   tf:v1:      the learner's work. Exported, imported, cleared by "forget
//               everything". Not renamed with the series: every learner's
//               saved code, revealed hints and passed marks live under it in
//               their own browser, and changing it orphans all of them
//               silently. The name it is short for is history.
//   tf:backup:  a copy of the nine per-exercise documents taken once, when
//               they were merged into the workbench. Not exported, because a
//               progress file would then carry two copies of everything, but
//               cleared by "forget everything", because it is course code.
//   tf:ui:      panel layout. Neither exported nor cleared: it belongs to the
//               machine, not to the work.

export const WORK = "tf:v1:";
export const BACKUP = "tf:backup:";

export function get(key: string, prefix = WORK): string | null {
  try {
    return localStorage.getItem(prefix + key);
  } catch {
    return null; // storage disabled: the course still works, nothing persists
  }
}

export function set(key: string, value: string, prefix = WORK): void {
  try {
    localStorage.setItem(prefix + key, value);
  } catch {
    // ignore: see above
  }
}

export function remove(key: string, prefix = WORK): void {
  try {
    localStorage.removeItem(prefix + key);
  } catch {
    // ignore
  }
}

/** Every stored key under a prefix, without the prefix. */
export function keysUnder(prefix = WORK): string[] {
  try {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) out.push(key.slice(prefix.length));
    }
    return out;
  } catch {
    return [];
  }
}
