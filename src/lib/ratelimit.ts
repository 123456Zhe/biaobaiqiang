const buckets = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX = 3;

export function allow(key: string): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 10000) buckets.clear();
  return true;
}
