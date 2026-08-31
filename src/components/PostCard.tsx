"use client";

import Link from "next/link";
import { useState } from "react";

type Post = {
  id: number;
  content: string;
  author: string | null;
  target: string | null;
  tag?: string | null;
  images: string;
  likeCount: number;
  liked?: boolean;
  pinned?: boolean;
  createdAt: string | Date;
};

function timeAgo(d: Date | string) {
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

export function PostCard({ post, onLike }: { post: Post; onLike: (id: number) => void }) {
  const [liked, setLiked] = useState(post.liked ?? false);
  const [count, setCount] = useState(post.likeCount);
  const [pop, setPop] = useState(false);

  const images: string[] = (() => {
    try {
      const v = JSON.parse(post.images);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  })();

  function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (liked) return;
    setLiked(true);
    setCount((c) => c + 1);
    setPop(true);
    onLike(post.id);
    setTimeout(() => setPop(false), 400);
  }

  return (
    <Link
      href={`/post/${post.id}`}
      className="group block bg-[var(--color-paper-soft)] rounded-[var(--radius-card)] p-6 border border-[var(--color-line)]/60 hover:border-[var(--color-line)] hover:shadow-[var(--shadow-soft)] transition-all duration-200"
    >
      {post.pinned && (
        <div className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 rounded-full bg-[var(--color-vermilion)]/10 text-[var(--color-vermilion-deep)] text-xs font-serif">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
            <path d="M12 17v5M9 4h6l1 7 2 2v2H6v-2l2-2 1-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          置顶
        </div>
      )}
      {post.tag && (
        <div className="inline-flex items-center ml-1.5 mb-2 px-2 py-0.5 rounded-full bg-[var(--color-paper)] border border-[var(--color-line)]/60 text-[var(--color-ink-soft)] text-xs font-serif">
          {post.tag}
        </div>
      )}
      {post.target && (
        <div className="text-xs text-[var(--color-ink-muted)] mb-3 font-serif">
          写给 <span className="text-[var(--color-vermilion-deep)]">{post.target}</span>
        </div>
      )}

      <p className="text-[15px] leading-[1.85] text-[var(--color-ink)] font-serif whitespace-pre-wrap break-words">
        {post.content.length > 120 ? post.content.slice(0, 120) + "…" : post.content}
      </p>

      {images.length > 0 && (
        <div
          className={`mt-4 grid gap-2 ${
            images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {images.slice(0, 4).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="w-full h-auto rounded-[var(--radius-sm)] object-cover max-h-72"
              loading="lazy"
            />
          ))}
        </div>
      )}

      <footer className="mt-5 pt-4 border-t border-[var(--color-line)]/60 flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <span>
          {post.author ? `— ${post.author}` : "— 匿名"} · {timeAgo(post.createdAt)}
        </span>
        <button
          onClick={handleLike}
          aria-label="点赞"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${
            liked
              ? "text-[var(--color-vermilion)]"
              : "hover:text-[var(--color-vermilion)]"
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
          <span className="tabular-nums">{count}</span>
        </button>
      </footer>
    </Link>
  );
}
