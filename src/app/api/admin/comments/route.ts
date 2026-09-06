import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const status = request.nextUrl.searchParams.get("status") ?? "pending";
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const items = await prisma.comment.findMany({
    where: {
      status,
      ...(q
        ? {
            OR: [{ content: { contains: q } }, { name: { contains: q } }],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json({ items });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const { ids, action } = (await request.json()) as {
    ids?: number[];
    action?: string;
  };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
    return Response.json({ error: "请选择 1-100 条" }, { status: 400 });
  }
  const numIds = [...new Set(ids.map(Number).filter((n) => Number.isFinite(n)))];
  if (numIds.length === 0) {
    return Response.json({ error: "无效 id" }, { status: 400 });
  }
  if (action === "delete") {
    const r = await prisma.comment.deleteMany({ where: { id: { in: numIds } } });
    await prisma.adminLog.create({
      data: { action: "batch_delete_comment", detail: numIds.join(",") },
    });
    return Response.json({ ok: true, count: r.count });
  }
  if (action !== "approve" && action !== "reject") {
    return Response.json({ error: "未知操作" }, { status: 400 });
  }
  const r = await prisma.comment.updateMany({
    where: { id: { in: numIds } },
    data: { status: action === "approve" ? "approved" : "rejected" },
  });
  await prisma.adminLog.create({
    data: { action: `batch_${action}_comment`, detail: numIds.join(",") },
  });
  return Response.json({ ok: true, count: r.count });
}
