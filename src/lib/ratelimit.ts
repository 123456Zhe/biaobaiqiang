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
  if (buckets.size > 10000) {
    // 只淘汰过期桶：直接 clear() 等于限流自毁（攻击者用 1 万个不同 key 就能清空所有人的限流记录）
    for (const [k, v] of buckets) {
      // 数组按时间追加，最后一个元素最新；最新一条已过期则整桶过期
      if (v.length === 0 || now - v[v.length - 1] >= WINDOW_MS) {
        buckets.delete(k);
      }
    }
  }
  return true;
}
