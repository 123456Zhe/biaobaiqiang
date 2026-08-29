import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { checkText } from "@/lib/dfa";
import { moderateText } from "@/lib/ai-moderation";
import { allow } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return Response.json({ error: "无效 id" }, { status: 400 });
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!allow(`comment:${ip}`)) {
    return Response.json({ error: "操作过于频繁，请稍后再试" }, { status: 429 });
  }

  const post = await prisma.post.findFirst({
    where: { id: numId, status: "approved" },
  });
  if (!post) {
    return Response.json({ error: "帖子不存在或未通过审核" }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    content?: string;
    visitorId?: string;
  };
  const name = (body.name ?? "").trim().slice(0, 20) || null;
  const content = (body.content ?? "").trim();
  const visitorId =
    body.visitorId && /^[a-zA-Z0-9-]{8,64}$/.test(body.visitorId)
      ? body.visitorId
      : null;

  if (!content) {
    return Response.json({ error: "评论不能为空" }, { status: 400 });
  }
  if (content.length > 500) {
    return Response.json({ error: "评论不能超过 500 字" }, { status: 400 });
  }

  const check = await checkText(content);
  if (check.hit) {
    return Response.json(
      { error: `评论包含敏感词：${check.word}` },
      { status: 400 },
    );
  }

  const ai = await moderateText(content);
  if (ai.verdict === "rejected") {
    return Response.json(
      { error: "评论未通过审核", reason: ai.reason },
      { status: 400 },
    );
  }
  if (ai.verdict === "error") {
    return Response.json(
      { error: "审核服务暂时不可用，请稍后重试" },
      { status: 400 },
    );
  }
  const status = ai.verdict === "approved" ? "approved" : "pending";

  const comment = await prisma.comment.create({
    data: {
      postId: numId,
      name,
      content,
      status,
      visitorId,
      aiVerdict: ai.verdict,
      aiReason: ai.reason,
    },
  });
  return Response.json({ ok: true, id: comment.id, status });
}
