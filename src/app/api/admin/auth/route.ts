import { NextRequest } from "next/server";
import { checkPassword, setSessionCookie, clearSessionCookie, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { password } = (await request.json()) as { password?: string };
  if (!password || !checkPassword(password)) {
    return Response.json({ error: "密码错误" }, { status: 401 });
  }
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
