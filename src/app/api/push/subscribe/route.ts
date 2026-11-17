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
  const { endpoint, visitorId: bodyVisitorId } = (await request.json()) as {
    endpoint?: string;
    visitorId?: string;
  };
  if (!endpoint) return Response.json({ error: "缺少 endpoint" }, { status: 400 });
  const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  // 订阅不存在时仍返回 ok（取消订阅幂等），但不泄露是否存在。
  if (!sub) return Response.json({ ok: true });

  // 管理员可删任意订阅。
  if (await isAdmin()) {
    await prisma.pushSubscription.delete({ where: { endpoint } });
    return Response.json({ ok: true });
  }

  // 访客只能删自己的订阅：订阅归属 visitorId 须与请求方一致。
  // visitorId 优先取请求体，兼容 x-visitor-id 请求头。
  const visitorId = bodyVisitorId ?? request.headers.get("x-visitor-id");
  if (
    sub.audience === "visitor" &&
    sub.visitorId &&
    visitorId &&
    sub.visitorId === visitorId
  ) {
    await prisma.pushSubscription.delete({ where: { endpoint } });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "只能删除自己的订阅" }, { status: 403 });
}
