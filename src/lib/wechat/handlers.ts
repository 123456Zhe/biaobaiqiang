import { prisma } from "@/lib/db";
import { checkText } from "@/lib/dfa";
import { IncomingMessage } from "./xml";

const SITE = process.env.PUBLIC_SITE_URL ?? "";

const WELCOME = `欢迎来到白墙 🕊
这里是校园表白墙，匿名的或署名的，都可以。

· 直接发消息：视为投稿
· 回复「我的」：查看投稿进度
· 回复「墙」：看最新留言
· 浏览更多：${SITE || "（请在公众号菜单点「逛一逛」）"}`;

const HELP = `白墙使用说明
· 直接发文字：投稿（最多 1000 字）
· 回复「我的」：查投稿进度
· 回复「墙」：看最近 3 条
· 上限 1000 字，太多会被截断
· 收到后先人工审核，通过后展示`;

const SENSITIVE_REPLY = "内容包含敏感词，未能提交。如有疑问请联系管理员。";
const RATE_LIMIT_REPLY = "投稿过于频繁，请稍后再试。";
const TOO_LONG_REPLY = "内容超出 1000 字，请精简后再发。";
const EMPTY_REPLY = "请说点什么。";
const REJECTED = "抱歉，审核未通过。如有疑问请联系管理员。";
const INTERNAL_ERR = "服务器打了个盹，请稍后再试。";

export type HandlerResult = { content: string | null };

export async function handleMessage(msg: IncomingMessage): Promise<HandlerResult> {
  if (msg.MsgType === "event" && msg.Event === "subscribe") {
    return { content: WELCOME };
  }
  if (msg.MsgType === "event" && msg.Event === "unsubscribe") {
    return { content: null };
  }
  if (msg.MsgType === "text") {
    const text = (msg.Content ?? "").trim();
    if (!text) return { content: EMPTY_REPLY };
    const lower = text.toLowerCase();

    if (lower === "帮助" || lower === "help" || lower === "?" || lower === "？") {
      return { content: HELP };
    }
    if (lower === "我的" || lower === "进度") {
      return { content: await listMyPosts(msg.FromUserName) };
    }
    if (lower === "墙" || lower === "看" || lower === "最新" || lower === "看看") {
      return { content: await listLatest() };
    }

    return { content: await submitPost(msg.FromUserName, text) };
  }
  return {
    content: "暂时只支持文字消息哦。直接发送文字即可投稿。",
  };
}

async function listMyPosts(openId: string) {
  const items = await prisma.post.findMany({
    where: { openId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  if (items.length === 0) return "你还没有投稿过。直接发消息即可。";
  const lines = items.map((p) => {
    const no = p.wechatNo ?? p.id;
    const preview = p.content.length > 14 ? p.content.slice(0, 14) + "…" : p.content;
    const status = p.status === "approved" ? "已上墙" : p.status === "rejected" ? "未通过" : "审核中";
    return `#${no} ${status} — ${preview}`;
  });
  return "最近的投稿：\n" + lines.join("\n");
}

async function listLatest() {
  const items = await prisma.post.findMany({
    where: { status: "approved" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  if (items.length === 0) return "墙上还很安静。\n" + (SITE || "");
  const lines = items.map((p) => {
    const no = p.wechatNo ?? p.id;
    const preview = p.content.length > 24 ? p.content.slice(0, 24) + "…" : p.content;
    return `#${no} ${preview}`;
  });
  return "墙上最新 3 条：\n" + lines.join("\n") + `\n${SITE || ""}`;
}

async function submitPost(openId: string, text: string) {
  if (text.length > 1000) return TOO_LONG_REPLY;

  const check = await checkText(text);
  if (check.hit) return SENSITIVE_REPLY;

  const max = await prisma.post.findFirst({
    orderBy: { wechatNo: "desc" },
    select: { wechatNo: true },
  });
  const nextNo = (max?.wechatNo ?? 0) + 1;

  try {
    const post = await prisma.post.create({
      data: {
        content: text,
        status: "pending",
        source: "wechat",
        openId,
        wechatNo: nextNo,
      },
    });
    const { createNotification, truncate } = await import("@/lib/notifications");
    await createNotification({
      audience: "admin",
      type: "pending",
      postId: post.id,
      title: `有新投稿等待审核（微信 #${post.wechatNo}）`,
      body: truncate(text, 60),
    });
    return `已收到，编号 #${post.wechatNo}。\n审核通过后展示在墙上。\n回复「我的」查进度。`;
  } catch (e) {
    console.error("wechat submit error", e);
    return INTERNAL_ERR;
  }
}
