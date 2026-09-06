import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { createNotification, truncate } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const status = request.nextUrl.searchParams.get("status") ?? "pending";
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const items = await prisma.post.findMany({
    where: {
      status,
      ...(q
        ? {
            OR: [
              { content: { contains: q } },
              { author: { contains: q } },
              { target: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json({ items });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const { ids, action } = (await request.json()) as {
    ids?: number[];
    action?: string;
  };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
    return Response.json({ error: "请选择 1-100 条" }, { status: 400 });
  }
  const numIds = [...new Set(ids.map(Number).filter((n) => Number.isFinite(n)))];
  if (numIds.length === 0) {
    return Response.json({ error: "无效 id" }, { status: 400 });
  }
  if (action === "delete") {
    const olds = await prisma.post.findMany({
      where: { id: { in: numIds } },
      select: { id: true, visitorId: true, content: true },
    });
    await prisma.post.deleteMany({ where: { id: { in: numIds } } });
    await prisma.adminLog.create({
      data: { action: "batch_delete", detail: numIds.join(",") },
    });
    await prisma.notification.updateMany({
      where: { audience: "admin", postId: { in: numIds }, type: "pending" },
      data: { read: true },
    });
    for (const o of olds) {
      if (o.visitorId) {
        await createNotification({
          audience: "visitor",
          visitorId: o.visitorId,
          type: "rejected",
          postId: o.id,
          title: "你的投稿未通过审核",
          body: truncate(o.content, 60),
        });
      }
    }
    return Response.json({ ok: true, count: olds.length });
  }
  if (action !== "approve" && action !== "reject") {
    return Response.json({ error: "未知操作" }, { status: 400 });
  }
  const posts = await prisma.post.findMany({
    where: { id: { in: numIds } },
  });
  await prisma.post.updateMany({
    where: { id: { in: numIds } },
    data: { status: action === "approve" ? "approved" : "rejected" },
  });
  await prisma.adminLog.create({
    data: { action: `batch_${action}`, detail: numIds.join(",") },
  });
  await prisma.notification.updateMany({
    where: { audience: "admin", postId: { in: numIds }, type: "pending" },
    data: { read: true },
  });
  for (const p of posts) {
    if (p.visitorId) {
      await createNotification({
        audience: "visitor",
        visitorId: p.visitorId,
        type: action === "approve" ? "approved" : "rejected",
        postId: p.id,
        title: action === "approve" ? "你的投稿已通过审核" : "你的投稿未通过审核",
        body: truncate(p.content, 60),
      });
    }
  }
  return Response.json({ ok: true, count: posts.length });
}
