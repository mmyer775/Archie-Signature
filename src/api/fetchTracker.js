// ============================================================
// fetchTracker — global "is fetching" counter
//
// Every callApi() increments the counter on entry and decrements
// on exit. Components (TopBar) subscribe to changes and render
// the global progress bar whenever the counter is > 0.
//
// This is intentionally framework-agnostic — no React imports,
// no context. The TopBar component bridges it into React with
// a useSyncExternalStore-style pattern.
// ============================================================

let count = 0;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn(count);
}

export function startFetch() {
  count += 1;
  emit();
}

export function endFetch() {
  count = Math.max(0, count - 1);
  emit();
}

export function isFetching() {
  return count > 0;
}

export function getFetchCount() {
  return count;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
