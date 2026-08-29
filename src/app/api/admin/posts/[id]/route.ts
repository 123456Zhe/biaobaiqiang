import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { createNotification, truncate } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return Response.json({ error: "无效 id" }, { status: 400 });
  }
  const { action } = (await request.json()) as { action?: string };
  const data: Record<string, string> = {};
  if (action === "approve") data.status = "approved";
  else if (action === "reject") data.status = "rejected";
  else if (action === "delete") {
    const old = await prisma.post.findUnique({ where: { id: numId } });
    await prisma.post.delete({ where: { id: numId } });
    await prisma.adminLog.create({ data: { action: "delete", postId: numId } });
    await prisma.notification.updateMany({
      where: { audience: "admin", postId: numId, type: "pending" },
      data: { read: true },
    });
    if (old?.visitorId) {
      await createNotification({
        audience: "visitor",
        visitorId: old.visitorId,
        type: "rejected",
        postId: numId,
        title: "你的投稿未通过审核",
        body: truncate(old.content, 60),
      });
    }
    return Response.json({ ok: true });
  } else {
    return Response.json({ error: "未知操作" }, { status: 400 });
  }
  const post = await prisma.post.update({ where: { id: numId }, data });
  await prisma.adminLog.create({ data: { action, postId: numId } });
  await prisma.notification.updateMany({
    where: { audience: "admin", postId: numId, type: "pending" },
    data: { read: true },
  });
  if (post.visitorId) {
    await createNotification({
      audience: "visitor",
      visitorId: post.visitorId,
      type: action === "approve" ? "approved" : "rejected",
      postId: numId,
      title:
        action === "approve" ? "你的投稿已通过审核" : "你的投稿未通过审核",
      body: truncate(post.content, 60),
    });
  }
  return Response.json({ ok: true });
}
