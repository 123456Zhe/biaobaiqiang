// 从请求头提取限流用的客户端 IP。
// 部署在反向代理（Caddy）之后：代理会把真实客户端 IP 写进 X-Real-IP，
// 并追加到 X-Forwarded-For 末尾。绝不能取 XFF 首项——客户端自填的
// 首项是伪造的，取首项等于限流可被无限绕过。
// 注意：若 3000 端口直接暴露在公网（不经过代理），任何请求头都不可信，
// 此时限流只能防君子；生产部署务必把应用放在反向代理之后。
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    // 取末跳：离应用最近的一跳，由可信代理追加，客户端伪造的首项无效。
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return "unknown";
}

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
