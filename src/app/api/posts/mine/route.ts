import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 小程序 / App 端「我的投稿」：按 visitorId 查询自己的投稿及审核状态
export async function GET(request: NextRequest) {
  const visitorId = request.nextUrl.searchParams.get("visitorId");
  if (!visitorId || !/^[a-zA-Z0-9-]{8,64}$/.test(visitorId)) {
    return Response.json({ error: "无效访客标识" }, { status: 400 });
  }
  const items = await prisma.post.findMany({
    where: { visitorId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      content: true,
      status: true,
      createdAt: true,
    },
  });
  return Response.json({ items });
}
