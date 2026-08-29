"use client";

import { useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { getVisitorId } from "@/components/NotificationBell";

type Post = {
  id: number;
  content: string;
  author: string | null;
  target: string | null;
  images: string;
  likeCount: number;
  liked: boolean;
  createdAt: string;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "image">("all");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadingRef = useRef(false);
  const loadedCursors = useRef<Set<string>>(new Set());

  async function loadMore() {
    if (loadingRef.current || done) return;
    const cursorKey = cursor === null ? "" : String(cursor);
    if (loadedCursors.current.has(cursorKey)) return;
    loadingRef.current = true;
    setLoading(true);
    loadedCursors.current.add(cursorKey);
    const params = new URLSearchParams({ take: "20" });
    if (cursor) params.set("cursor", String(cursor));
    try {
      const res = await fetch(`/api/posts?${params}`, {
        headers: { "x-visitor-id": getVisitorId() },
      });
      const data = await res.json();
      if (data.items.length === 0) {
        setDone(true);
      } else {
        setPosts((p) => {
          const seen = new Set(p.map((x) => x.id));
          const fresh = data.items.filter((x: Post) => !seen.has(x.id));
          return [...p, ...fresh];
        });
        setCursor(data.nextCursor);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, done]);

  const visible = posts.filter((p) => {
    if (filter === "image") {
      try {
        return JSON.parse(p.images).length > 0;
      } catch {
        return false;
      }
    }
    return true;
  });

  async function handleLike(id: number) {
    const res = await fetch(`/api/posts/${id}/like`, {
      method: "POST",
      headers: { "x-visitor-id": getVisitorId() },
    }).catch(() => null);
    if (res && res.status === 409) {
      setPosts((p) =>
        p.map((x) => (x.id === id ? { ...x, liked: true } : x)),
      );
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
      <section className="mb-12 sm:mb-16 max-w-2xl">
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[var(--color-ink)] leading-[1.2] tracking-tight">
          把想说的话，<br />
          <span className="text-[var(--color-vermilion)]">轻轻</span>贴上墙。
        </h1>
        <p className="mt-5 text-[var(--color-ink-soft)] text-base leading-relaxed max-w-md">
          校园表白墙，匿名的或署名的，都可以。
          每一条投稿都会先经过审核，再被温柔展示。
        </p>
      </section>

      <div className="flex items-center justify-between mb-6 text-sm">
        <div className="flex items-center gap-1 p-1 bg-[var(--color-paper-soft)] rounded-full border border-[var(--color-line)]/60">
          {(["all", "image"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-4 py-1.5 rounded-full transition-colors ${
                filter === k
                  ? "bg-[var(--color-paper)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
              }`}
            >
              {k === "all" ? "全部" : "带图"}
            </button>
          ))}
        </div>
        <span className="text-[var(--color-ink-muted)] tabular-nums">
          {visible.length} 条
        </span>
      </div>

      {visible.length === 0 && !loading && (
        <div className="text-center py-32 text-[var(--color-ink-muted)]">
          <p className="font-serif text-xl text-[var(--color-ink-soft)] mb-2">墙上还很安静</p>
          <p className="text-sm">做第一个留言的人吧。</p>
        </div>
      )}

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
        {visible.map((p, i) => (
          <div
            key={p.id}
            className="mb-5 break-inside-avoid animate-rise"
            style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}
          >
            <PostCard post={p} onLike={handleLike} />
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="text-center py-8 text-sm text-[var(--color-ink-muted)]">
          正在取更多留言…
        </div>
      )}
      {done && posts.length > 0 && (
        <div className="text-center py-8 text-sm text-[var(--color-ink-muted)] font-serif">
          —— 墙底 ——
        </div>
      )}
    </div>
  );
}
