import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return Response.json({ error: "无效 id" }, { status: 400 });
  }
  const comment = await prisma.comment.findUnique({ where: { id: numId } });
  if (!comment) {
    return Response.json({ error: "评论不存在" }, { status: 404 });
  }

  // 管理员可删任意评论
  if (await isAdmin()) {
    await prisma.comment.delete({ where: { id: numId } });
    return Response.json({ ok: true });
  }

  // 发评人本人可删自己的评论（凭 visitorId）
  const visitorId = request.headers.get("x-visitor-id");
  if (
    comment.visitorId &&
    visitorId &&
    /^[a-zA-Z0-9-]{8,64}$/.test(visitorId) &&
    comment.visitorId === visitorId
  ) {
    await prisma.comment.delete({ where: { id: numId } });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "只能删除自己的评论" }, { status: 403 });
}
