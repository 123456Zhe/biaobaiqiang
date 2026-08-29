import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  listNotifications,
  unreadCount,
  markRead,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function resolve(request: NextRequest) {
  if (await isAdmin()) return { audience: "admin" as const };
  const visitorId = request.nextUrl.searchParams.get("visitorId");
  if (visitorId && /^[a-zA-Z0-9-]{8,64}$/.test(visitorId)) {
    return { audience: "visitor" as const, visitorId };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const who = await resolve(request);
  if (!who) return Response.json({ error: "未登录" }, { status: 401 });
  const cursor = request.nextUrl.searchParams.get("cursor");
  const items = await listNotifications({
    audience: who.audience,
    visitorId: "visitorId" in who ? who.visitorId : undefined,
    cursor: cursor ? Number(cursor) : null,
  });
  const hasMore = items.length > 20;
  return Response.json({
    items: items.slice(0, 20),
    nextCursor: hasMore ? items[19].id : null,
    unread: await unreadCount(who),
  });
}

export async function POST(request: NextRequest) {
  const who = await resolve(request);
  if (!who) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await request.json()) as { id?: number; all?: boolean };
  await markRead({
    audience: who.audience,
    visitorId: "visitorId" in who ? who.visitorId : undefined,
    id: body.id,
    all: body.all,
  });
  return Response.json({ ok: true });
}
