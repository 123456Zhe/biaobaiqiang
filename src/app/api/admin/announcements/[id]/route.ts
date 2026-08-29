import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

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
  if (action === "toggle") {
    const item = await prisma.announcement.findUnique({ where: { id: numId } });
    if (!item) {
      return Response.json({ error: "公告不存在" }, { status: 404 });
    }
    await prisma.announcement.update({
      where: { id: numId },
      data: { active: !item.active },
    });
    return Response.json({ ok: true });
  }
  if (action === "delete") {
    await prisma.announcement.delete({ where: { id: numId } });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "未知操作" }, { status: 400 });
}
