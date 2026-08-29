"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("visitor_id", id);
  }
  return id;
}

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

const TYPE_META: Record<string, { icon: string; color: string }> = {
  approved: { icon: "✓", color: "var(--color-moss)" },
  rejected: { icon: "✕", color: "var(--color-amber)" },
  pending: { icon: "✎", color: "var(--color-vermilion)" },
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const visitorId = useRef<string>("");
  useEffect(() => {
    visitorId.current = getVisitorId();
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.admin));
  }, []);

  const applySnapshot = useCallback((data: { items: Notification[]; unread: number }) => {
    setItems(data.items);
    setUnread(data.unread);
  }, []);

  const fetchList = useCallback(async () => {
    const qs = authed ? "" : `?visitorId=${encodeURIComponent(visitorId.current)}`;
    const res = await fetch(`/api/notifications${qs}`);
    if (!res.ok) return;
    applySnapshot(await res.json());
  }, [authed, applySnapshot]);

  // 初次加载 + SSE + 轮询降级
  useEffect(() => {
    if (authed === null) return;
    fetchList();

    let es: EventSource | null = null;
    let closed = false;
    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(fetchList, 30000);
    };
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const qs = authed ? "" : `?visitorId=${encodeURIComponent(visitorId.current)}`;
    try {
      es = new EventSource(`/api/notifications/stream${qs}`);
      es.addEventListener("snapshot", (e) => {
        stopPolling();
        applySnapshot(JSON.parse((e as MessageEvent).data));
      });
      es.onerror = () => {
        es?.close();
        es = null;
        if (!closed) startPolling();
      };
    } catch {
      startPolling();
    }

    const onFocus = () => fetchList();
    window.addEventListener("focus", onFocus);
    return () => {
      closed = true;
      es?.close();
      stopPolling();
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function markAll() {
    const qs = authed ? "" : `?visitorId=${encodeURIComponent(visitorId.current)}`;
    await fetch(`/api/notifications${qs}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((p) => p.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function clickItem(n: Notification) {
    const qs = authed ? "" : `?visitorId=${encodeURIComponent(visitorId.current)}`;
    if (!n.read) {
      fetch(`/api/notifications${qs}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - (n.read ? 0 : 1)));
    setOpen(false);
    if (n.type === "approved" && n.postId) router.push(`/post/${n.postId}`);
    else if (n.type === "pending") router.push("/admin");
    else if (n.type === "rejected") router.push("/notifications");
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`通知${unread > 0 ? `，${unread} 条未读` : ""}`}
        className="relative p-2 rounded-full hover:bg-[var(--color-paper-soft)] transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="w-5 h-5 text-[var(--color-ink-soft)]"
        >
          <path
            d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a1.94 1.94 0 003.4 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-vermilion)] text-[var(--color-paper)] text-[10px] leading-4 text-center tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[360px] max-w-[calc(100vw-2rem)] bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[var(--radius-card)] shadow-[var(--shadow-lift)] z-50 overflow-hidden animate-rise">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
            <h3 className="font-serif text-lg text-[var(--color-ink)]">通知</h3>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-vermilion-deep)] transition-colors"
              >
                全部已读
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-serif text-[var(--color-ink-soft)] mb-1">还没有通知</p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                投稿的审核结果会出现在这里
              </p>
            </div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {items.map((n) => {
                const meta = TYPE_META[n.type] ?? TYPE_META.pending;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => clickItem(n)}
                      className={`w-full text-left px-5 py-4 flex gap-3 border-b border-[var(--color-line)]/50 last:border-b-0 hover:bg-[var(--color-paper-soft)] transition-colors ${
                        n.read ? "" : "bg-[var(--color-paper-soft)]/60"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`w-1 rounded-full self-stretch ${n.read ? "bg-transparent" : "bg-[var(--color-vermilion)]"}`}
                      />
                      <span
                        aria-hidden
                        className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0"
                        style={{ background: `${meta.color}1a`, color: meta.color }}
                      >
                        {meta.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-[var(--color-ink)] leading-snug">
                          {n.title}
                        </span>
                        {n.body && (
                          <span className="block text-xs text-[var(--color-ink-muted)] mt-1 line-clamp-2">
                            {n.body}
                          </span>
                        )}
                        <span className="block text-[11px] text-[var(--color-ink-muted)] mt-1.5 text-right">
                          {timeAgo(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-[var(--color-line)] px-5 py-3 flex items-center justify-between">
            <PushToggle compact />
            <button
              onClick={() => {
                setOpen(false);
                router.push("/notifications");
              }}
              className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-vermilion-deep)] transition-colors"
            >
              查看全部
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
