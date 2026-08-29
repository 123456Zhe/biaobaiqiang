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
  const items = await prisma.post.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json({ items });
}
