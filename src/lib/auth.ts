import { cookies, headers } from "next/headers";
import crypto from "node:crypto";

const COOKIE = "admin_session";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const MAX_AGE = 60 * 60 * 12;

function sign(value: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

export function makeToken() {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

export function verifyToken(token: string) {
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  if (Date.now() - Number(ts) > MAX_AGE * 1000) return false;
  return sign(ts) === sig;
}

export function checkPassword(pwd: string) {
  const a = crypto.createHash("sha256").update(pwd).digest();
  const b = crypto.createHash("sha256").update(PASSWORD).digest();
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
