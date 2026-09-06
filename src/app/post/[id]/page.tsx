"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVisitorId } from "@/components/NotificationBell";

type Post = {
  id: number;
  content: string;
  author: string | null;
  target: string | null;
  imageList: string[];
  likeCount: number;
  liked: boolean;
  createdAt: string;
};

type Comment = {
  id: number;
  name: string | null;
  content: string;
  createdAt: string;
  mine: boolean;
  replyToId: number | null;
  replyToName: string | null;
  likeCount: number;
  liked: boolean;
};

function timeAgo(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} 天前`;
  return date.toLocaleDateString("zh-CN");
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [pop, setPop] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${id}`, { headers: { "x-visitor-id": getVisitorId() } })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "加载失败");
          return;
        }
        setPost(data.post);
        setLiked(!!data.post.liked);
        setComments(data.comments);
      })
      .catch(() => setError("加载失败"));
  }, [id]);

  async function handleLike() {
    if (liked) return;
    setLiked(true);
    setPop(true);
    setPost((p) => (p ? { ...p, likeCount: p.likeCount + 1 } : p));
    setTimeout(() => setPop(false), 400);
    const res = await fetch(`/api/posts/${id}/like`, {
      method: "POST",
      headers: { "x-visitor-id": getVisitorId() },
    }).catch(() => null);
    if (!res || res.status === 409) {
      // 已点过赞或请求失败，以服务端计数为准
      const r = await fetch(`/api/posts/${id}`, {
        headers: { "x-visitor-id": getVisitorId() },
      }).catch(() => null);
      if (r && r.ok) {
        const d = await r.json();
        setPost(d.post);
        setLiked(!!d.post.liked);
      }
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setMsg(null);
    const res = await fetch(`/api/posts/${id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        content: content.trim(),
        visitorId: getVisitorId(),
        replyToId: replyTo?.id ?? null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setContent("");
      setReplyTo(null);
      setMsg(
        data.status === "pending" ? "评论已提交，待审核后展示。" : "评论已发布。",
      );
      const r = await fetch(`/api/posts/${id}`, {
        headers: { "x-visitor-id": getVisitorId() },
      });
      if (r.ok) {
        const d = await r.json();
        setComments(d.comments);
      }
    } else {
      setMsg(data.error ?? "提交失败");
    }
    setSubmitting(false);
  }

  async function handleCommentLike(c: Comment) {
    if (c.liked) return;
    setComments((p) =>
      p.map((x) =>
        x.id === c.id
          ? { ...x, liked: true, likeCount: x.likeCount + 1 }
          : x,
      ),
    );
    await fetch(`/api/comments/${c.id}/like`, {
      method: "POST",
      headers: { "x-visitor-id": getVisitorId() },
    }).catch(() => null);
  }

  function handleShare() {
    setSharing(true);
    try {
      const el = document.getElementById("share-card");
      if (!el) return;
      const xml = new XMLSerializer().serializeToString(el);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1000"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 750;
        canvas.height = 1000;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#faf7f1";
        ctx.fillRect(0, 0, 750, 1000);
        ctx.drawImage(img, 0, 0, 750, 1000);
        const a = document.createElement("a");
        a.download = `whitewall-${id}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    } finally {
      setTimeout(() => setSharing(false), 800);
    }
  }

  async function handleDelete(cid: number) {
    if (!confirm("确定删除这条评论？")) return;
    const res = await fetch(`/api/comments/${cid}`, {
      method: "DELETE",
      headers: { "x-visitor-id": getVisitorId() },
    });
    if (res.ok) {
      setComments((p) => p.filter((x) => x.id !== cid));
    } else {
      const d = await res.json();
      setMsg(d.error ?? "删除失败");
    }
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
        <p className="font-serif text-2xl text-[var(--color-ink-soft)] mb-4">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2 rounded-full bg-[var(--color-vermilion)] text-[var(--color-paper)] hover:bg-[var(--color-vermilion-deep)] transition-colors text-sm"
        >
          回到墙上
        </button>
      </div>
    );
  }

  if (!post) {
    return <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center text-[var(--color-ink-muted)]">…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <button
        onClick={() => router.back()}
        className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors mb-8"
      >
        ← 返回
      </button>

      <article className="bg-[var(--color-paper-soft)] rounded-[var(--radius-card)] border border-[var(--color-line)]/60 p-5 sm:p-10">
        {post.target && (
          <div className="text-sm text-[var(--color-ink-muted)] mb-5 font-serif">
            写给 <span className="text-[var(--color-vermilion-deep)]">{post.target}</span>
          </div>
        )}
        <p className="font-serif text-lg sm:text-xl leading-[2] text-[var(--color-ink)] whitespace-pre-wrap break-words">
          {post.content}
        </p>
        {post.imageList.length > 0 && (
          <div className="mt-8 grid gap-3">
            {post.imageList.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="w-full rounded-[var(--radius-sm)]" />
            ))}
          </div>
        )}
        <div className="mt-8 pt-6 border-t border-[var(--color-line)] flex items-center justify-between">
          <span className="text-xs text-[var(--color-ink-muted)]">
            {post.author ?? "匿名"} · {timeAgo(post.createdAt)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-line)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-40"
            >
              {sharing ? "生成中…" : "分享卡片"}
            </button>
            <button
              onClick={handleLike}
            aria-label="点赞"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-line)] transition-colors ${
              liked ? "text-[var(--color-vermilion)]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-vermilion)]"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              className={`w-4 h-4 ${pop ? "animate-heart" : ""}`}
            >
              <path d="M12 21s-7-4.5-9.5-9.5C.8 7.8 3.4 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.6 0 6.2 3.8 4.5 7.5C19 16.5 12 21 12 21z" />
            </svg>
            <span className="text-xs tabular-nums">{post.likeCount}</span>
            </button>
          </div>
        </div>
      </article>

      <div style={{ position: "absolute", left: -9999, top: 0 }} aria-hidden>
        <div
          id="share-card"
          style={{
            width: 750,
            minHeight: 1000,
            background: "#faf7f1",
            padding: 64,
            fontFamily: "serif",
            color: "#2b2620",
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 8 }}>
            <span style={{ color: "#c8402a" }}>白</span>墙
          </div>
          <div style={{ fontSize: 22, color: "#8a8378", marginBottom: 40 }}>
            把想说的话，轻轻贴上墙。
          </div>
          {post.target && (
            <div style={{ fontSize: 24, color: "#8a8378", marginBottom: 20 }}>
              写给 {post.target}
            </div>
          )}
          <div
            style={{
              fontSize: 30,
              lineHeight: 2,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {post.content.slice(0, 500)}
          </div>
          <div
            style={{
              marginTop: 60,
              paddingTop: 24,
              borderTop: "1px solid #e5ddcf",
              fontSize: 22,
              color: "#8a8378",
            }}
          >
            {post.author ?? "匿名"} · {new Date(post.createdAt).toLocaleDateString("zh-CN")} · 帖子 #{post.id}
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-[var(--color-ink)] mb-6">
          评论 <span className="text-sm text-[var(--color-ink-muted)]">（{comments.length}）</span>
        </h2>

        <form onSubmit={handleComment} className="space-y-4 mb-8">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="昵称（留空即匿名）"
            maxLength={20}
            className="w-full bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-[var(--radius-sm)] px-4 py-2.5 text-sm focus:border-[var(--color-vermilion)] outline-none transition-colors"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder="说点什么…"
            rows={3}
            className="w-full bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed focus:border-[var(--color-vermilion)] outline-none transition-colors resize-none"
          />
          {replyTo && (
            <div className="flex items-center justify-between text-xs bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-[var(--radius-sm)] px-4 py-2">
              <span className="text-[var(--color-ink-soft)] truncate">
                回复 @{replyTo.name ?? "匿名"}：{replyTo.content.slice(0, 30)}
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="ml-2 text-[var(--color-ink-muted)] hover:text-[var(--color-crimson)] shrink-0"
              >
                取消
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-ink-muted)]">
              {msg ?? "发布后展示，存疑内容需审核"}
            </span>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-5 py-2 rounded-full bg-[var(--color-vermilion)] text-[var(--color-paper)] hover:bg-[var(--color-vermilion-deep)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {submitting ? "发送中…" : "发送"}
            </button>
          </div>
        </form>

        {comments.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)] py-6">还没有评论，坐个沙发？</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li
                key={c.id}
                className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-sm)] px-5 py-4"
              >
                <div className="text-xs text-[var(--color-ink-muted)] mb-2 flex items-center justify-between">
                  <span>
                    {c.name ?? "匿名"} · {timeAgo(c.createdAt)}
                    {c.mine && (
                      <span className="ml-2 text-[var(--color-vermilion-deep)]">· 我</span>
                    )}
                  </span>
                  {c.mine && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="hover:text-[var(--color-crimson)] transition-colors"
                    >
                      删除
                    </button>
                  )}
                </div>
                {c.replyToName !== null && c.replyToName !== undefined && (
                  <div className="text-xs text-[var(--color-ink-muted)] mb-2">
                    回复 <span className="text-[var(--color-vermilion-deep)]">@{c.replyToName ?? "匿名"}</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed text-[var(--color-ink)] whitespace-pre-wrap break-words">
                  {c.content}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
                  <button
                    onClick={() => handleCommentLike(c)}
                    className={`transition-colors ${c.liked ? "text-[var(--color-vermilion)]" : "hover:text-[var(--color-vermilion)]"}`}
                  >
                    ♥ {c.likeCount > 0 ? c.likeCount : "赞"}
                  </button>
                  <button
                    onClick={() => setReplyTo(c)}
                    className="hover:text-[var(--color-ink)] transition-colors"
                  >
                    回复
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
