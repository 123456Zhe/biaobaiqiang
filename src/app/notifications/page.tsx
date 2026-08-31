"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getVisitorId } from "@/components/NotificationBell";
import { PushToggle } from "@/components/PushToggle";

type Notification = {
  id: number;
  type: string;
  postId: number | null;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_META: Record<string, { icon: string; color: string }> = {
  approved: { icon: "✓", color: "var(--color-moss)" },
  rejected: { icon: "✕", color: "var(--color-amber)" },
  pending: { icon: "✎", color: "var(--color-vermilion)" },
};

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(s).toLocaleDateString("zh-CN");
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.admin));
  }, []);

  const qs = useCallback(
    (extra = "") =>
      `${authed ? "" : `visitorId=${encodeURIComponent(getVisitorId())}`}${extra ? `&${extra}` : ""}`,
    [authed],
  );

  const load = useCallback(async () => {
    if (authed === null || loadingRef.current || done) return;
    loadingRef.current = true;
    const res = await fetch(`/api/notifications?${qs(cursor ? `cursor=${cursor}` : "")}`);
    if (res.ok) {
      const data = await res.json();
      setItems((p) => {
        const seen = new Set(p.map((x) => x.id));
        return [...p, ...data.items.filter((x: Notification) => !seen.has(x.id))];
      });
      setCursor(data.nextCursor);
      if (!data.nextCursor) setDone(true);
    }
    loadingRef.current = false;
  }, [authed, cursor, done, qs]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && load(),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  async function markAll() {
    await fetch(`/api/notifications?${qs()}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((p) => p.map((n) => ({ ...n, read: true })));
  }

  async function clickItem(n: Notification) {
    if (!n.read) {
      fetch(`/api/notifications?${qs()}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.type === "approved" && n.postId) router.push(`/post/${n.postId}`);
    else if (n.type === "pending") router.push("/admin");
  }

  if (authed === null) {
    return <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-[var(--color-ink-muted)]">…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl text-[var(--color-ink)]">通知</h1>
        <div className="flex items-center gap-4">
          <PushToggle />
          <button
            onClick={markAll}
            className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-vermilion-deep)] transition-colors"
          >
            全部已读
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="text-center py-24">
          <p className="font-serif text-xl text-[var(--color-ink-soft)] mb-2">还没有通知</p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            投稿的审核结果会出现在这里
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((n) => {
          const meta = TYPE_META[n.type] ?? TYPE_META.pending;
          return (
            <li key={n.id}>
              <button
                onClick={() => clickItem(n)}
                className={`w-full text-left bg-[var(--color-paper-soft)] border rounded-[var(--radius-card)] p-5 flex gap-4 transition-colors ${
                  n.read
                    ? "border-[var(--color-line)]/60"
                    : "border-[var(--color-vermilion)]/30 bg-[var(--color-paper-soft)]"
                } hover:border-[var(--color-line)] hover:shadow-[var(--shadow-soft)]`}
              >
                <span
                  aria-hidden
                  className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                  style={{ background: `${meta.color}1a`, color: meta.color }}
                >
                  {meta.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--color-ink)] leading-snug">
                      {n.title}
                    </span>
                    <span className="text-[11px] text-[var(--color-ink-muted)] shrink-0">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  {n.body && (
                    <span className="block text-xs text-[var(--color-ink-muted)] mt-1.5 leading-relaxed">
                      {n.body}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div ref={sentinelRef} className="h-1" />
      {done && items.length > 0 && (
        <div className="text-center py-8 text-sm text-[var(--color-ink-muted)] font-serif">
          —— 到底了 ——
        </div>
      )}
    </div>
  );
}
