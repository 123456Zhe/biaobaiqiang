import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { safeJsonArray } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return Response.json({ error: "无效 id" }, { status: 400 });
  }
  const post = await prisma.post.findFirst({
    where: { id: numId, status: "approved" },
  });
  if (!post) {
    return Response.json({ error: "帖子不存在或未通过审核" }, { status: 404 });
  }
  const visitorId = request.headers.get("x-visitor-id");
  const validVisitor =
    visitorId && /^[a-zA-Z0-9-]{8,64}$/.test(visitorId) ? visitorId : null;
  const liked = validVisitor
    ? !!(await prisma.like.findUnique({
        where: { postId_visitorId: { postId: numId, visitorId: validVisitor } },
      }))
    : false;
  const comments = await prisma.comment.findMany({
    where: { postId: numId, status: "approved" },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({
    post: { ...post, imageList: safeJsonArray(post.images), liked },
    comments: comments.map((c) => ({
      id: c.id,
      name: c.name,
      content: c.content,
      createdAt: c.createdAt,
      mine: !!validVisitor && c.visitorId === validVisitor,
    })),
  });
}
