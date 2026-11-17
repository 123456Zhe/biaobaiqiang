import { cookies, headers } from "next/headers";
import crypto from "node:crypto";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 12;

// 历史上公开过的弱默认值（旧代码 / .env.example / docker-compose 里出现过的值）。
// 生产环境绝不能用这些值启动。
const FORBIDDEN_VALUES = new Set([
  "admin123",
  "dev-secret-change-me",
  "change-me-in-prod",
  "change-me-in-production",
  "please-change-this",
  "change-me",
]);

function isProduction() {
  return process.env.NODE_ENV === "production";
}

// 读密钥：undefined、空串、纯空白一律视为未设置。
// 注意 ?? 兜不住空串——空串环境变量曾导致空密码可登录、空 HMAC 密钥可伪造会话。
function readSecret(name: "ADMIN_PASSWORD" | "SESSION_SECRET"): string | null {
  const v = process.env[name];
  if (v === undefined) return null;
  const trimmed = v.trim();
  return trimmed ? trimmed : null;
}

// 启动时校验（由 src/instrumentation.ts 的 register() 在服务启动时调用）。
// 生产环境下缺失、为空或等于公开弱默认值时直接抛错，服务拒绝启动。
// 开发环境不拦截（本地调试可用默认值），但会在首次使用时打警告。
export function validateAdminConfig(): void {
  if (!isProduction()) return;
  for (const name of ["ADMIN_PASSWORD", "SESSION_SECRET"] as const) {
    const v = readSecret(name);
    if (v === null) {
      throw new Error(
        `[auth] ${name} 未设置或为空：生产环境必须在 .env 中配置强随机值，服务拒绝启动`,
      );
    }
    if (FORBIDDEN_VALUES.has(v)) {
      throw new Error(
        `[auth] ${name} 使用了公开的弱默认值：请在 .env 中改成强随机值，服务拒绝启动`,
      );
    }
  }
}

// 懒解析：不在模块顶层求值，避免 next build 因缺环境变量失败；
// 运行时生产环境非法时抛错（validateAdminConfig 应已在启动时拦截，
// 这里是最后一道防线），开发环境警告后用仅供本地的默认值。
function resolveSecret(
  name: "ADMIN_PASSWORD" | "SESSION_SECRET",
  devFallback: string,
): string {
  const v = readSecret(name);
  if (v !== null && !FORBIDDEN_VALUES.has(v)) return v;
  if (isProduction()) {
    throw new Error(`[auth] ${name} 未配置有效值，拒绝继续`);
  }
  if (v !== null) {
    console.warn(
      `[auth] ${name} 为公开弱默认值，仅开发环境可用，生产环境会拒绝启动`,
    );
  } else {
    console.warn(`[auth] ${name} 未设置，使用开发默认值，仅本地调试可用`);
  }
  return devFallback;
}

function getPassword() {
  return resolveSecret("ADMIN_PASSWORD", "admin123");
}

function getSessionSecret() {
  return resolveSecret("SESSION_SECRET", "dev-only-insecure-secret");
}

// 服务端撤销名单：revokeToken() 后该 session 立即失效。
// 单实例内存实现（重启清空）；多实例部署如需共享撤销状态再换外部存储。
const revoked = new Set<string>();

export function revokeToken(token: string) {
  const sig = token.split(".")[1];
  if (sig) revoked.add(sig);
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("hex");
}

export function makeToken() {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

export function verifyToken(token: string) {
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  if (revoked.has(sig)) return false;
  if (Date.now() - Number(ts) > MAX_AGE * 1000) return false;
  return sign(ts) === sig;
}

export function checkPassword(pwd: string) {
  const a = crypto.createHash("sha256").update(pwd).digest();
  const b = crypto.createHash("sha256").update(getPassword()).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function isAdmin() {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  return t ? verifyToken(t) : false;
}

export async function setSessionCookie() {
  const c = await cookies();
  const h = await headers();
  const isHttps =
    h.get("x-forwarded-proto")?.split(",")[0].trim() === "https" ||
    (h.get("referer") ?? "").startsWith("https://");
  c.set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}
