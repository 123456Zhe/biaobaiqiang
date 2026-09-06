import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start14 = new Date(startOfToday);
  start14.setDate(start14.getDate() - 13);
  const start7 = new Date(startOfToday);
  start7.setDate(start7.getDate() - 6);

  const [
    totalPosts,
    pendingPosts,
    approvedPosts,
    rejectedPosts,
    totalComments,
    pendingComments,
    totalLikes,
    todayPosts,
    weekPosts,
    recent,
    sources,
    tags,
  ] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { status: "pending" } }),
    prisma.post.count({ where: { status: "approved" } }),
    prisma.post.count({ where: { status: "rejected" } }),
    prisma.comment.count(),
    prisma.comment.count({ where: { status: "pending" } }),
    prisma.like.count(),
    prisma.post.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.post.count({ where: { createdAt: { gte: start7 } } }),
    prisma.post.findMany({
      where: { createdAt: { gte: start14 } },
      select: { createdAt: true },
    }),
    prisma.post.groupBy({ by: ["source"], _count: { source: true } }),
    prisma.post.groupBy({
      by: ["tag"],
      where: { tag: { not: null } },
      _count: { tag: true },
    }),
  ]);

  const daily: Array<{ date: string; count: number }> = [];
  const counts = new Map<string, number>();
  for (const p of recent) {
    const d = p.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (let i = 0; i < 14; i++) {
    const d = new Date(start14);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    daily.push({ date: key, count: counts.get(key) ?? 0 });
  }

  const logs = await prisma.adminLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return Response.json({
    totals: {
      posts: totalPosts,
      pending: pendingPosts,
      approved: approvedPosts,
      rejected: rejectedPosts,
      comments: totalComments,
      pendingComments,
      likes: totalLikes,
      today: todayPosts,
      week: weekPosts,
    },
    daily,
    sources: sources.map((s) => ({ name: s.source, count: s._count.source })),
    tags: tags.map((t) => ({ name: t.tag ?? "无", count: t._count.tag })),
    logs,
  });
}
