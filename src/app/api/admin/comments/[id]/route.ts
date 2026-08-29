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
  const data: Record<string, string> = {};
  if (action === "approve") data.status = "approved";
  else if (action === "reject") data.status = "rejected";
  else if (action === "delete") {
    await prisma.comment.delete({ where: { id: numId } });
    await prisma.adminLog.create({ data: { action: "delete_comment" } });
    return Response.json({ ok: true });
  } else {
    return Response.json({ error: "未知操作" }, { status: 400 });
  }
  await prisma.comment.update({ where: { id: numId }, data });
  await prisma.adminLog.create({ data: { action: `${action}_comment` } });
  return Response.json({ ok: true });
}
