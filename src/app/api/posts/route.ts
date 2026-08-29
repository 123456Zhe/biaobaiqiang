import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { checkText } from "@/lib/dfa";
import { allow } from "@/lib/ratelimit";
import { seedSensitiveWords } from "@/lib/seed";
import { createNotification, truncate } from "@/lib/notifications";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGES = 9;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

async function saveImage(file: File): Promise<string> {
  if (file.size > MAX_SIZE) throw new Error("图片不能超过 5MB");
  if (!ALLOWED.has(file.type)) throw new Error("仅支持 jpg/png/webp");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  return `/api/uploads/${name}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const cursor = searchParams.get("cursor");
  const take = Math.min(Number(searchParams.get("take") ?? 20), 50);

  const where = { status: "approved" as const };
  const posts = await prisma.post.findMany({
    where,
    take: take + 1,
    ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });
  const hasMore = posts.length > take;
  const items = posts.slice(0, take);
  const visitorId = request.headers.get("x-visitor-id");
  const validVisitor =
    visitorId && /^[a-zA-Z0-9-]{8,64}$/.test(visitorId) ? visitorId : null;
  let likedSet = new Set<number>();
  if (validVisitor && items.length > 0) {
    const likes = await prisma.like.findMany({
      where: { visitorId: validVisitor, postId: { in: items.map((p) => p.id) } },
      select: { postId: true },
    });
    likedSet = new Set(likes.map((l) => l.postId));
  }
  return Response.json({
    items: items.map((p) => ({ ...p, liked: likedSet.has(p.id) })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

export async function POST(request: NextRequest) {
  await seedSensitiveWords();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!allow(ip)) {
    return Response.json({ error: "操作过于频繁，请稍后再试" }, { status: 429 });
  }

  const form = await request.formData();
  const content = String(form.get("content") ?? "").trim();
  const author = String(form.get("author") ?? "").trim() || null;
  const target = String(form.get("target") ?? "").trim() || null;
  const visitorId = String(form.get("visitorId") ?? "").trim() || null;
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  if (!content) {
    return Response.json({ error: "内容不能为空" }, { status: 400 });
  }
  if (content.length > 1000) {
    return Response.json({ error: "内容不能超过 1000 字" }, { status: 400 });
  }
  if (files.length > MAX_IMAGES) {
    return Response.json({ error: `最多上传 ${MAX_IMAGES} 张图片` }, { status: 400 });
  }

  const check = await checkText(content);
  if (check.hit) {
    return Response.json(
      { error: `内容包含敏感词：${check.word}` },
      { status: 400 },
    );
  }

  const imageUrls: string[] = [];
  for (const file of files) {
    try {
      imageUrls.push(await saveImage(file));
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "图片上传失败" },
        { status: 400 },
      );
    }
  }

  const post = await prisma.post.create({
    data: {
      content,
      author,
      target,
      images: JSON.stringify(imageUrls),
      status: "pending",
      source: "web",
      visitorId,
    },
  });

  await createNotification({
    audience: "admin",
    type: "pending",
    postId: post.id,
    title: "有新投稿等待审核",
    body: truncate(content, 60),
  });

  return Response.json({ ok: true, id: post.id, status: post.status });
}
