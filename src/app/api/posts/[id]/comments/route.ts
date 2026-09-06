import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification, truncate } from "@/lib/notifications";
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
    replyToId?: number;
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

  let replyToName: string | null = null;
  if (body.replyToId !== undefined && body.replyToId !== null) {
    const target = await prisma.comment.findFirst({
      where: { id: Number(body.replyToId), postId: numId, status: "approved" },
      select: { id: true, name: true },
    });
    if (!target) {
      return Response.json({ error: "回复的评论不存在" }, { status: 400 });
    }
    replyToName = target.name;
  }

  const comment = await prisma.comment.create({
    data: {
      postId: numId,
      name,
      content,
      status,
      visitorId,
      replyToId:
        body.replyToId !== undefined && body.replyToId !== null
          ? Number(body.replyToId)
          : null,
      replyToName,
      aiVerdict: ai.verdict,
      aiReason: ai.reason,
    },
  });
  if (status === "pending") {
    await createNotification({
      audience: "admin",
      type: "pending_comment",
      postId: numId,
      title: "有新评论等待审核",
      body: truncate(content, 60),
    });
  }
  return Response.json({ ok: true, id: comment.id, status });
}
