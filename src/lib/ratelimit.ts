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
// 默认策略：同一 key 10 分钟内最多 3 次（投稿/点赞/评论沿用此默认值）。
const WINDOW_MS = 10 * 60 * 1000;
const MAX = 3;
// buckets 中最后一条记录已过期的桶视为整体过期；淘汰时用已见过的
// 最长窗口，避免把仍在其他限流窗口内的桶误删。
let longestWindowMs = WINDOW_MS;
const MAX_BUCKETS = 10000;

export type RateLimitOptions = {
  /** 窗口内允许的次数，默认 3。 */
  limit?: number;
  /** 窗口长度（毫秒），默认 10 分钟。 */
  windowMs?: number;
};

/**
 * 记一次尝试；超出限制返回 false，且不记录本次尝试。
 * `allow(key)` 保持原有的 10 分钟 3 次语义。
 */
export function allow(key: string, options: RateLimitOptions = {}): boolean {
  const windowMs = options.windowMs ?? WINDOW_MS;
  const limit = options.limit ?? MAX;
  if (windowMs > longestWindowMs) longestWindowMs = windowMs;
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  evictExpired(now);
  return true;
}

/**
 * 清空某个 key 的计数。用于“成功即归零”的场景（例如登录成功后
 * 不再把这次成功尝试留在暴力破解计数里）。
 */
export function reset(key: string): void {
  buckets.delete(key);
}

function evictExpired(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  // 只淘汰过期桶：直接 clear() 等于限流自毁（攻击者用 1 万个不同 key 就能清空所有人的限流记录）
  for (const [k, v] of buckets) {
    // 数组按时间追加，最后一个元素最新；最新一条已过期则整桶过期
    if (v.length === 0 || now - v[v.length - 1] >= longestWindowMs) {
      buckets.delete(k);
    }
  }
}
