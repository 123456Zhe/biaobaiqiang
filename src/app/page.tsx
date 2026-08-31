"use client";

import { useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { getVisitorId } from "@/components/NotificationBell";

import { TAGS } from "@/lib/tags";

type Post = {
  id: number;
  content: string;
  author: string | null;
  target: string | null;
  tag: string | null;
  images: string;
  likeCount: number;
  liked: boolean;
  pinned?: boolean;
  createdAt: string;
};

type Announcement = {
  id: number;
  content: string;
  createdAt: string;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinned, setPinned] = useState<Post[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "image">("all");
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadingRef = useRef(false);
  const cursorRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const qRef = useRef("");
  const tagRef = useRef("");
  const loadedCursors = useRef<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => {
      const v = query.trim();
      if (v !== qRef.current) {
        qRef.current = v;
        setQ(v);
        resetAndLoad();
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetAndLoad() {
    cursorRef.current = null;
    doneRef.current = false;
    loadedCursors.current.clear();
    setPosts([]);
    setPinned([]);
    setDone(false);
    loadMore();
  }

  async function loadMore() {
    if (loadingRef.current || doneRef.current) return;
    const cursorKey = cursorRef.current === null ? "" : String(cursorRef.current);
    if (loadedCursors.current.has(cursorKey)) return;
    loadingRef.current = true;
    setLoading(true);
    loadedCursors.current.add(cursorKey);
    const params = new URLSearchParams({ take: "20" });
    if (cursorRef.current !== null) params.set("cursor", String(cursorRef.current));
    if (qRef.current) params.set("q", qRef.current);
    if (tagRef.current) params.set("tag", tagRef.current);
    try {
      const res = await fetch(`/api/posts?${params}`, {
        headers: { "x-visitor-id": getVisitorId() },
      });
      const data = await res.json();
      setPinned(data.pinned ?? []);
      setAnnouncements(data.announcements ?? []);
      if (data.items.length === 0) {
        doneRef.current = true;
        setDone(true);
      } else {
        setPosts((p) => {
          const seen = new Set(p.map((x) => x.id));
          const fresh = data.items.filter((x: Post) => !seen.has(x.id));
          return [...p, ...fresh];
        });
        cursorRef.current = data.nextCursor;
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

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
  }, []);

  const matchesFilter = (p: Post) => {
    if (filter === "image") {
      try {
        return JSON.parse(p.images).length > 0;
      } catch {
        return false;
      }
    }
    return true;
  };
  const pinnedVisible = pinned.filter(matchesFilter);
  const visible = posts.filter(matchesFilter);

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
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

      <div className="mb-6 space-y-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索内容、写给谁、署名…"
          className="w-full bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-full px-5 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-vermilion)] outline-none transition-colors"
        />
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 p-1 bg-[var(--color-paper-soft)] rounded-full border border-[var(--color-line)]/60 flex-wrap">
            {["", ...TAGS].map((t) => (
              <button
                key={t || "all"}
                onClick={() => {
                  if (t === tagRef.current) return;
                  tagRef.current = t;
                  setTag(t);
                  resetAndLoad();
                }}
                className={`px-4 py-1.5 rounded-full transition-colors ${
                  tag === t
                    ? "bg-[var(--color-paper)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
                }`}
              >
                {t || "全部"}
              </button>
            ))}
          </div>
          {!q && !tag && (
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
          )}
          <span className="text-[var(--color-ink-muted)] tabular-nums">
            {pinnedVisible.length + visible.length} 条
          </span>
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="mb-8 space-y-2">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 bg-[var(--color-paper-soft)] border border-[var(--color-vermilion)]/20 rounded-[var(--radius-card)] px-5 py-3.5"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="w-4 h-4 mt-1 text-[var(--color-vermilion)] shrink-0"
              >
                <path
                  d="M3 10v4l11 4V6L3 10zM14 8.5c1.5 0 3 1.6 3 3.5s-1.5 3.5-3 3.5M6 14v4a1 1 0 0 0 1 1h2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm text-[var(--color-ink)] leading-relaxed font-serif whitespace-pre-wrap break-words">
                {a.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {pinnedVisible.length + visible.length === 0 && !loading && (
        <div className="text-center py-32 text-[var(--color-ink-muted)]">
          {q || tag ? (
            <>
              <p className="font-serif text-xl text-[var(--color-ink-soft)] mb-2">没有找到相关内容</p>
              <p className="text-sm">换个关键词试试吧。</p>
            </>
          ) : (
            <>
              <p className="font-serif text-xl text-[var(--color-ink-soft)] mb-2">墙上还很安静</p>
              <p className="text-sm">做第一个留言的人吧。</p>
            </>
          )}
        </div>
      )}

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
        {[...pinnedVisible, ...visible].map((p, i) => (
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
