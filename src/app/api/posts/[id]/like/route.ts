import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { allow } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!allow(`like:${ip}`)) {
    return Response.json({ error: "操作过于频繁，请稍后再试" }, { status: 429 });
  }
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return Response.json({ error: "无效 id" }, { status: 400 });
  }
  const visitorId = request.headers.get("x-visitor-id");
  if (!visitorId || !/^[a-zA-Z0-9-]{8,64}$/.test(visitorId)) {
    return Response.json({ error: "无效访客标识" }, { status: 400 });
  }
  const post = await prisma.post.findFirst({
    where: { id: numId, status: "approved" },
    select: { id: true },
  });
  if (!post) {
    return Response.json({ error: "帖子不存在或未通过审核" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.like.create({
        data: { postId: numId, visitorId },
      });
      await tx.post.update({
        where: { id: numId },
        data: { likeCount: { increment: 1 } },
      });
    });
  } catch {
    // 唯一约束冲突：该访客已点过赞
    return Response.json({ error: "已经点过赞啦" }, { status: 409 });
  }

  const updated = await prisma.post.findUnique({
    where: { id: numId },
    select: { likeCount: true },
  });
  return Response.json({ likeCount: updated?.likeCount ?? 0 });
}
