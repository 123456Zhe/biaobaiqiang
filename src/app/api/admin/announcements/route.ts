import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { checkText } from "@/lib/dfa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const items = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json({ items });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const { content } = (await request.json()) as { content?: string };
  const text = String(content ?? "").trim();
  if (!text) {
    return Response.json({ error: "内容不能为空" }, { status: 400 });
  }
  if (text.length > 200) {
    return Response.json({ error: "公告不能超过 200 字" }, { status: 400 });
  }
  const check = await checkText(text);
  if (check.hit) {
    return Response.json(
      { error: `内容包含敏感词：${check.word}` },
      { status: 400 },
    );
  }
  const item = await prisma.announcement.create({ data: { content: text } });
  await prisma.adminLog.create({
    data: { action: "announcement.create", detail: text.slice(0, 50) },
  });
  return Response.json({ ok: true, item });
}
