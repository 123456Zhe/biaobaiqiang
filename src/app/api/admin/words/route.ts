import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { reloadWords } from "@/lib/dfa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const items = await prisma.sensitiveWord.findMany({ orderBy: { word: "asc" } });
  return Response.json({ items: items.map((i) => i.word) });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const { word } = (await request.json()) as { word?: string };
  const w = (word ?? "").trim().toLowerCase();
  if (!w) return Response.json({ error: "词不能为空" }, { status: 400 });
  await prisma.sensitiveWord.upsert({
    where: { word: w },
    update: {},
    create: { word: w },
  });
  await reloadWords();
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const word = request.nextUrl.searchParams.get("word");
  if (!word) return Response.json({ error: "word 必填" }, { status: 400 });
  await prisma.sensitiveWord.delete({ where: { word } });
  await reloadWords();
  return Response.json({ ok: true });
}
