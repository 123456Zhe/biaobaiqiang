import { NextRequest } from "next/server";
import { checkPassword, setSessionCookie, clearSessionCookie, isAdmin } from "@/lib/auth";
import { allow, getClientIp, reset } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 登录口是全站最需要防暴力破解的地方：按客户端 IP 限流，
// 10 分钟内最多 5 次尝试（失败尝试也计次），超限返回 429。
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
// 失败后固定延迟，进一步拖慢在线枚举（SHA-256 比较本身极快）。
const FAILURE_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tooManyAttempts() {
  return Response.json(
    { error: "尝试过于频繁，请稍后再试" },
    {
      status: 429,
      headers: { "Retry-After": String(LOGIN_WINDOW_MS / 1000) },
    },
  );
}

export async function POST(request: NextRequest) {
  // 先解析请求体：格式错误（非 JSON）的请求不视作一次密码尝试，不计次。
  let password: string | undefined;
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : undefined;
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  // 限流检查必须在密码校验之前：失败尝试也要计次。
  const key = `admin-login:${getClientIp(request.headers)}`;
  if (!allow(key, { limit: LOGIN_LIMIT, windowMs: LOGIN_WINDOW_MS })) {
    return tooManyAttempts();
  }

  if (!password || !checkPassword(password)) {
    await sleep(FAILURE_DELAY_MS);
    return Response.json({ error: "密码错误" }, { status: 401 });
  }

  // 登录成功：清空该 IP 的计数，避免管理员被自己之前的失败尝试拖到 429。
  reset(key);
  await setSessionCookie();
  return Response.json({ ok: true });
}

export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}

export async function GET() {
  return Response.json({ admin: await isAdmin() });
}
