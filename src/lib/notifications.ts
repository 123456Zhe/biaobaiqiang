import { prisma } from "@/lib/db";

export type NotificationDTO = {
  id: number;
  type: string;
  postId: number | null;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: Date;
};

export async function listNotifications(opts: {
  audience: "visitor" | "admin";
  visitorId?: string;
  take?: number;
  cursor?: number | null;
}) {
  const where =
    opts.audience === "admin"
      ? { audience: "admin" }
      : { audience: "visitor", visitorId: opts.visitorId };
  const take = Math.min(opts.take ?? 20, 50);
  return prisma.notification.findMany({
    where,
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });
}

export async function unreadCount(opts: {
  audience: "visitor" | "admin";
  visitorId?: string;
}) {
  const where =
    opts.audience === "admin"
      ? { audience: "admin", read: false }
      : { audience: "visitor", visitorId: opts.visitorId, read: false };
  return prisma.notification.count({ where });
}

export async function markRead(opts: {
  audience: "visitor" | "admin";
  visitorId?: string;
  id?: number;
  all?: boolean;
}) {
  const base =
    opts.audience === "admin"
      ? { audience: "admin" }
      : { audience: "visitor", visitorId: opts.visitorId };
  if (opts.all) {
    await prisma.notification.updateMany({ where: base, data: { read: true } });
  } else if (opts.id) {
    await prisma.notification.updateMany({
      where: { ...base, id: opts.id },
      data: { read: true },
    });
  }
}

export async function createNotification(data: {
  audience: "visitor" | "admin";
  visitorId?: string | null;
  type: string;
  postId?: number | null;
  title: string;
  body?: string | null;
}) {
  const n = await prisma.notification.create({ data });

  // 离线推送（Web Push）；失败不影响主流程
  try {
    const { pushTo } = await import("./push");
    const url =
      data.type === "approved" && data.postId
        ? `/post/${data.postId}`
        : data.audience === "admin"
        ? "/admin"
        : "/notifications";
    await pushTo({
      audience: data.audience,
      visitorId: data.visitorId,
      payload: {
        title: data.title,
        body: data.body ?? undefined,
        url,
        tag: `bbq-${n.id}`,
      },
    });
  } catch (e) {
    console.error("push send error", e);
  }

  return n;
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
