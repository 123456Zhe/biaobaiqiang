import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { vapidPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json({ key: vapidPublicKey() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    subscription?: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    visitorId?: string;
  };
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ error: "无效订阅" }, { status: 400 });
  }

  let audience: "admin" | "visitor";
  let visitorId: string | null = null;
  if (await isAdmin()) {
    audience = "admin";
  } else if (body.visitorId && /^[a-zA-Z0-9-]{8,64}$/.test(body.visitorId)) {
    audience = "visitor";
    visitorId = body.visitorId;
  } else {
    return Response.json({ error: "缺少身份" }, { status: 401 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, audience, visitorId },
    create: {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      audience,
      visitorId,
    },
  });
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { endpoint } = (await request.json()) as { endpoint?: string };
  if (!endpoint) return Response.json({ error: "缺少 endpoint" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return Response.json({ ok: true });
}
