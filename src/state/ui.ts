// Panel layout, kept under its own prefix.
//
// Deliberately NOT under tf:v1:, which is what exportProgress scans and what
// resetAll clears. A progress file is the learner's work moving between
// machines; it must not carry one machine's window layout to another, and
// "forget everything about the course" should not mean "and also forget how
// wide you like the panel".

const PREFIX = "tf:ui:";

function get(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null; // storage disabled: the panel still works, nothing persists
  }
}

function set(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // ignore: see above
  }
}

export function loadUi(key: string): string | null {
  return get(key);
}

export function saveUi(key: string, value: string): void {
  set(key, value);
}

export function loadUiNumber(key: string, fallback: number): number {
  const raw = get(key);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function loadUiFlag(key: string, fallback = false): boolean {
  const raw = get(key);
  return raw === null ? fallback : raw === "1";
}

export function saveUiFlag(key: string, value: boolean): void {
  set(key, value ? "1" : "0");
}

export function clearUi(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
