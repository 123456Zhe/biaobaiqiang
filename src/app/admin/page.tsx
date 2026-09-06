"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Post = {
  id: number;
  content: string;
  author: string | null;
  target: string | null;
  images: string;
  status: string;
  source: string;
  pinned: boolean;
  aiVerdict: string | null;
  aiReason: string | null;
  createdAt: string;
};

type Comment = {
  id: number;
  postId: number;
  name: string | null;
  content: string;
  status: string;
  aiVerdict: string | null;
  aiReason: string | null;
  createdAt: string;
};

const AI_LABELS: Record<string, { label: string; className: string }> = {
  approved: { label: "AI通过", className: "bg-[var(--color-moss)]/10 text-[var(--color-moss)]" },
  rejected: { label: "AI拒绝", className: "bg-[var(--color-crimson)]/10 text-[var(--color-crimson)]" },
  uncertain: { label: "AI存疑", className: "bg-[var(--color-amber)]/10 text-[var(--color-amber)]" },
  error: { label: "AI异常", className: "bg-[var(--color-line)] text-[var(--color-ink-muted)]" },
};

function AiBadge({ verdict, reason }: { verdict: string | null; reason: string | null }) {
  if (!verdict) return null;
  const meta = AI_LABELS[verdict];
  if (!meta) return null;
  return (
    <span
      title={reason ?? undefined}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

type Word = string;

type Announcement = {
  id: number;
  content: string;
  active: boolean;
  createdAt: string;
};

type Stats = {
  totals: {
    posts: number;
    pending: number;
    approved: number;
    rejected: number;
    comments: number;
    likes: number;
    today: number;
    week: number;
  };
  daily: Array<{ date: string; count: number }>;
  sources: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
  logs: Array<{
    id: number;
    action: string;
    postId: number | null;
    detail: string | null;
    createdAt: string;
  }>;
};

const TABS = ["stats", "pending", "approved", "rejected", "comments", "words", "announcements"] as const;

const TAB_LABELS: Record<string, string> = {
  stats: "统计",
  pending: "待审",
  approved: "已通过",
  rejected: "已拒绝",
  comments: "评论",
  words: "词库",
  announcements: "公告",
};

function DistBars({
  title,
  data,
  color,
}: {
  title: string;
  data: Array<{ name: string; count: number }>;
  color: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <h2 className="font-serif text-lg text-[var(--color-ink)] mb-3">{title}</h2>
      <div className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-5 space-y-3">
        {data.length === 0 && (
          <div className="text-xs text-[var(--color-ink-muted)]">暂无数据</div>
        )}
        {data.map((d) => (
          <div key={d.name}>
            <div className="flex justify-between text-xs text-[var(--color-ink-muted)] mb-1">
              <span>{d.name}</span>
              <span className="tabular-nums">{d.count}</span>
            </div>
            <div className="h-2 bg-[var(--color-paper)] rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full`}
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [newWord, setNewWord] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selPosts, setSelPosts] = useState<Set<number>>(new Set());
  const [selComments, setSelComments] = useState<Set<number>>(new Set());
  const [commentStatus, setCommentStatus] = useState("pending");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && (TABS as readonly string[]).includes(t)) {
      setTab(t as (typeof TABS)[number]);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((d) => {
        if (!d.admin) router.replace("/admin/login");
        else setAuthed(true);
      });
  }, [router]);

  async function loadPosts(status: string, q = "") {
    setLoading(true);
    setSelPosts(new Set());
    const res = await fetch(
      `/api/admin/posts?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    );
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const data = await res.json();
    setPosts(data.items ?? []);
    setLoading(false);
  }

  async function loadWords() {
    const res = await fetch("/api/admin/words");
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const data = await res.json();
    setWords(data.items ?? []);
  }

  async function loadComments(status: string, q = "") {
    setLoading(true);
    setSelComments(new Set());
    const res = await fetch(
      `/api/admin/comments?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    );
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const data = await res.json();
    setComments(data.items ?? []);
    setLoading(false);
  }

  async function loadAnnouncements() {
    const res = await fetch("/api/admin/announcements");
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const data = await res.json();
    setAnnouncements(data.items ?? []);
  }

  async function loadStats() {
    const res = await fetch("/api/admin/stats");
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const data = await res.json();
    setStats(data);
  }

  useEffect(() => {
    if (!authed) return;
    if (tab === "words") loadWords();
    else if (tab === "comments") loadComments(commentStatus);
    else if (tab === "announcements") loadAnnouncements();
    else if (tab === "stats") loadStats();
    else loadPosts(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed]);

  async function act(id: number, action: string) {
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setPosts((p) => p.filter((x) => x.id !== id));
    }
  }

  async function togglePin(id: number, pinned: boolean) {
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: pinned ? "unpin" : "pin" }),
    });
    if (res.ok) {
      setPosts((p) =>
        p.map((x) => (x.id === id ? { ...x, pinned: !pinned } : x)),
      );
    }
  }

  async function addAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: newAnnouncement.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNewAnnouncement("");
      loadAnnouncements();
    } else {
      alert(data.error ?? "发布失败");
    }
  }

  async function actAnnouncement(id: number, action: string) {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) loadAnnouncements();
  }

  async function batchPosts(action: string) {
    if (selPosts.size === 0) return;
    if (!confirm(`确定对 ${selPosts.size} 条执行 ${action}？`)) return;
    const res = await fetch("/api/admin/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [...selPosts], action }),
    });
    if (res.ok) {
      const done = new Set(selPosts);
      setPosts((p) => p.filter((x) => !done.has(x.id)));
      setSelPosts(new Set());
    }
  }

  async function batchComments(action: string) {
    if (selComments.size === 0) return;
    if (!confirm(`确定对 ${selComments.size} 条执行 ${action}？`)) return;
    const res = await fetch("/api/admin/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [...selComments], action }),
    });
    if (res.ok) {
      const done = new Set(selComments);
      setComments((p) => p.filter((x) => !done.has(x.id)));
      setSelComments(new Set());
    }
  }

  function exportCsv(kind: "posts" | "comments") {
    const rows = (
      kind === "posts" ? (posts as unknown as Record<string, unknown>[]) : (comments as unknown as Record<string, unknown>[])
    ).map((x) =>
      [x.id, x.content, x.status, x.createdAt]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([`\uFEFFid,content,status,createdAt\n${rows.join("\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function actComment(id: number, action: string) {
    const res = await fetch(`/api/admin/comments/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setComments((p) => p.filter((x) => x.id !== id));
    }
  }

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    if (!newWord.trim()) return;
    const res = await fetch("/api/admin/words", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ word: newWord.trim() }),
    });
    if (res.ok) {
      setNewWord("");
      loadWords();
    }
  }

  async function removeWord(w: string) {
    const res = await fetch(`/api/admin/words?word=${encodeURIComponent(w)}`, {
      method: "DELETE",
    });
    if (res.ok) loadWords();
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  }

  if (authed === null) {
    return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-[var(--color-ink-muted)]">…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl sm:text-3xl text-[var(--color-ink)]">管理后台</h1>
        <button
          onClick={logout}
          className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          退出
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 bg-[var(--color-paper-soft)] rounded-full border border-[var(--color-line)]/60 mb-8 w-fit text-sm flex-wrap">
        {TABS.map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 sm:px-4 py-1.5 rounded-full transition-colors ${
              tab === k
                ? "bg-[var(--color-paper)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
            }`}
          >
            {TAB_LABELS[k]}
          </button>
        ))}
      </div>

      {tab === "stats" ? (
        !stats ? (
          <div className="text-[var(--color-ink-muted)] text-sm">…</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "帖子总数", value: stats.totals.posts },
                { label: "待审核", value: stats.totals.pending },
                { label: "已通过", value: stats.totals.approved },
                { label: "已拒绝", value: stats.totals.rejected },
                { label: "评论总数", value: stats.totals.comments },
                { label: "点赞总数", value: stats.totals.likes },
                { label: "今日新投稿", value: stats.totals.today },
                { label: "近 7 天投稿", value: stats.totals.week },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-4"
                >
                  <div className="text-2xl font-serif text-[var(--color-ink)] tabular-nums">
                    {c.value}
                  </div>
                  <div className="text-xs text-[var(--color-ink-muted)] mt-1">{c.label}</div>
                </div>
              ))}
            </div>

            <div>
              <h2 className="font-serif text-lg text-[var(--color-ink)] mb-3">近 14 天投稿</h2>
              <div className="flex items-end gap-1.5 h-36 bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-4">
                {stats.daily.map((d) => {
                  const max = Math.max(...stats.daily.map((x) => x.count), 1);
                  return (
                    <div
                      key={d.date}
                      title={`${d.date}：${d.count} 条`}
                      className="flex-1 flex flex-col items-center justify-end h-full gap-1.5"
                    >
                      <span className="text-[10px] text-[var(--color-ink-muted)] tabular-nums">
                        {d.count > 0 ? d.count : ""}
                      </span>
                      <div
                        className="w-full rounded-t-[3px] bg-[var(--color-vermilion)]/60 min-h-[2px]"
                        style={{ height: `${Math.max((d.count / max) * 100, 1)}%` }}
                      />
                      <span className="text-[10px] text-[var(--color-ink-muted)] whitespace-nowrap">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <DistBars title="来源分布" data={stats.sources} color="bg-[var(--color-moss)]/70" />
              <DistBars title="标签分布" data={stats.tags} color="bg-[var(--color-vermilion)]/60" />
            </div>

            <div>
              <h2 className="font-serif text-lg text-[var(--color-ink)] mb-3">最近操作</h2>
              <div className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-5 space-y-2">
                {stats.logs.length === 0 && (
                  <div className="text-xs text-[var(--color-ink-muted)]">暂无记录</div>
                )}
                {stats.logs.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]"
                  >
                    <span>
                      {l.action}
                      {l.postId !== null ? ` · 帖子 #${l.postId}` : ""}
                      {l.detail ? ` · ${l.detail}` : ""}
                    </span>
                    <span className="tabular-nums">
                      {new Date(l.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : tab === "announcements" ? (
        <div>
          <form onSubmit={addAnnouncement} className="flex gap-2 mb-6">
            <input
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              placeholder="发布公告（最多 200 字）"
              maxLength={200}
              className="flex-1 bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-[var(--radius-sm)] px-4 py-2.5 text-sm focus:border-[var(--color-vermilion)] outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[var(--color-vermilion)] text-[var(--color-paper)] hover:bg-[var(--color-vermilion-deep)] transition-colors text-sm"
            >
              发布
            </button>
          </form>
          <div className="space-y-3">
            {!loading && announcements.length === 0 && (
              <div className="text-center py-20 text-[var(--color-ink-muted)] text-sm">暂无公告</div>
            )}
            {announcements.map((a) => (
              <div
                key={a.id}
                className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-5"
              >
                <p className="text-sm leading-relaxed text-[var(--color-ink)] whitespace-pre-wrap mb-3">
                  {a.content}
                </p>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--color-ink-muted)]">
                  <span>
                    {new Date(a.createdAt).toLocaleString("zh-CN")} ·{" "}
                    {a.active ? "展示中" : "已下线"}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => actAnnouncement(a.id, "toggle")}
                      className="px-3 py-1 rounded-full bg-[var(--color-moss)]/10 text-[var(--color-moss)] hover:bg-[var(--color-moss)]/20 transition-colors"
                    >
                      {a.active ? "下线" : "上线"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("确定删除该公告？")) actAnnouncement(a.id, "delete");
                      }}
                      className="px-3 py-1 rounded-full text-[var(--color-ink-muted)] hover:text-[var(--color-crimson)] transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === "words" ? (
        <div>
          <form onSubmit={addWord} className="flex gap-2 mb-6">
            <input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="添加敏感词"
              className="flex-1 bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-[var(--radius-sm)] px-4 py-2.5 text-sm focus:border-[var(--color-vermilion)] outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[var(--color-vermilion)] text-[var(--color-paper)] hover:bg-[var(--color-vermilion-deep)] transition-colors text-sm"
            >
              添加
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {words.map((w) => (
              <span
                key={w}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-full text-sm"
              >
                {w}
                <button
                  onClick={() => removeWord(w)}
                  className="text-[var(--color-ink-muted)] hover:text-[var(--color-crimson)]"
                  aria-label="删除"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : tab === "comments" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="flex items-center gap-1 p-1 bg-[var(--color-paper-soft)] rounded-full border border-[var(--color-line)]/60 text-xs">
              {(["pending", "approved", "rejected"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setCommentStatus(st);
                    loadComments(st, search);
                  }}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    commentStatus === st
                      ? "bg-[var(--color-paper)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                      : "text-[var(--color-ink-muted)]"
                  }`}
                >
                  {st === "pending" ? "待审" : st === "approved" ? "已通过" : "已拒绝"}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadComments(commentStatus, search);
              }}
              className="flex gap-2 flex-1 min-w-[200px]"
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索评论内容、昵称…"
                className="flex-1 bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-full px-4 py-1.5 text-xs focus:border-[var(--color-vermilion)] outline-none"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-full bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 text-xs hover:text-[var(--color-ink)]"
              >
                搜索
              </button>
            </form>
            <button
              onClick={() => exportCsv("comments")}
              className="px-3 py-1.5 rounded-full text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-line)]/60"
            >
              导出 CSV
            </button>
          </div>
          {selComments.size > 0 && (
            <div className="flex items-center gap-2 text-xs bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] px-4 py-2.5 sticky top-16 z-10">
              <span className="text-[var(--color-ink-soft)]">已选 {selComments.size} 条</span>
              <button onClick={() => batchComments("approve")} className="px-3 py-1 rounded-full bg-[var(--color-moss)]/10 text-[var(--color-moss)]">通过</button>
              <button onClick={() => batchComments("reject")} className="px-3 py-1 rounded-full bg-[var(--color-amber)]/10 text-[var(--color-amber)]">拒绝</button>
              <button onClick={() => batchComments("delete")} className="px-3 py-1 rounded-full text-[var(--color-crimson)]">删除</button>
              <button onClick={() => setSelComments(new Set())} className="ml-auto text-[var(--color-ink-muted)]">取消</button>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
            <input
              type="checkbox"
              checked={comments.length > 0 && selComments.size === comments.length}
              onChange={(e) =>
                setSelComments(
                  e.target.checked ? new Set(comments.map((c) => c.id)) : new Set(),
                )
              }
            />
            全选
          </label>
          {loading && <div className="text-[var(--color-ink-muted)] text-sm">…</div>}
          {!loading && comments.length === 0 && (
            <div className="text-center py-20 text-[var(--color-ink-muted)] text-sm">暂无评论</div>
          )}
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-5 flex gap-3"
            >
              <input
                type="checkbox"
                checked={selComments.has(c.id)}
                onChange={(e) =>
                  setSelComments((prev) => {
                    const n = new Set(prev);
                    if (e.target.checked) n.add(c.id);
                    else n.delete(c.id);
                    return n;
                  })
                }
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed text-[var(--color-ink)] whitespace-pre-wrap mb-3">
                  {c.content}
                </p>
                <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)] flex-wrap gap-2">
                  <span>
                    {c.name ?? "匿名"} · 帖子 #{c.postId} ·{" "}
                    {new Date(c.createdAt).toLocaleString("zh-CN")}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <AiBadge verdict={c.aiVerdict} reason={c.aiReason} />
                    {commentStatus === "pending" && (
                      <>
                        <button
                          onClick={() => actComment(c.id, "approve")}
                          className="px-3 py-1 rounded-full bg-[var(--color-moss)]/10 text-[var(--color-moss)]"
                        >
                          通过
                        </button>
                        <button
                          onClick={() => actComment(c.id, "reject")}
                          className="px-3 py-1 rounded-full bg-[var(--color-amber)]/10 text-[var(--color-amber)]"
                        >
                          拒绝
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("确定删除？")) actComment(c.id, "delete");
                      }}
                      className="px-3 py-1 rounded-full text-[var(--color-ink-muted)] hover:text-[var(--color-crimson)] transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(tab === "pending" || tab === "approved" || tab === "rejected") && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadPosts(tab, search);
                }}
                className="flex gap-2 flex-1 min-w-[200px]"
              >
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索内容、作者、表白对象…"
                  className="flex-1 bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-full px-4 py-1.5 text-xs focus:border-[var(--color-vermilion)] outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 text-xs hover:text-[var(--color-ink)]"
                >
                  搜索
                </button>
              </form>
              <button
                onClick={() => exportCsv("posts")}
                className="px-3 py-1.5 rounded-full text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-line)]/60"
              >
                导出 CSV
              </button>
            </div>
          )}
          {selPosts.size > 0 && (
            <div className="flex items-center gap-2 text-xs bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] px-4 py-2.5 sticky top-16 z-10">
              <span className="text-[var(--color-ink-soft)]">已选 {selPosts.size} 条</span>
              <button onClick={() => batchPosts("approve")} className="px-3 py-1 rounded-full bg-[var(--color-moss)]/10 text-[var(--color-moss)]">通过</button>
              <button onClick={() => batchPosts("reject")} className="px-3 py-1 rounded-full bg-[var(--color-amber)]/10 text-[var(--color-amber)]">拒绝</button>
              <button onClick={() => batchPosts("delete")} className="px-3 py-1 rounded-full text-[var(--color-crimson)]">删除</button>
              <button onClick={() => setSelPosts(new Set())} className="ml-auto text-[var(--color-ink-muted)]">取消</button>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
            <input
              type="checkbox"
              checked={posts.length > 0 && selPosts.size === posts.length}
              onChange={(e) =>
                setSelPosts(
                  e.target.checked ? new Set(posts.map((x) => x.id)) : new Set(),
                )
              }
            />
            全选
          </label>
          {loading && <div className="text-[var(--color-ink-muted)] text-sm">…</div>}
          {!loading && posts.length === 0 && (
            <div className="text-center py-20 text-[var(--color-ink-muted)] text-sm">暂无</div>
          )}
          {posts.map((p) => {
            const imgs: string[] = (() => {
              try {
                return JSON.parse(p.images);
              } catch {
                return [];
              }
            })();
            return (
              <div
                key={p.id}
                className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-5 flex gap-3"
              >
                <input
                  type="checkbox"
                  checked={selPosts.has(p.id)}
                  onChange={(e) =>
                    setSelPosts((prev) => {
                      const n = new Set(prev);
                      if (e.target.checked) n.add(p.id);
                      else n.delete(p.id);
                      return n;
                    })
                  }
                  className="mt-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                {p.target && (
                  <div className="text-xs text-[var(--color-ink-muted)] mb-2 font-serif">
                    写给 <span className="text-[var(--color-vermilion-deep)]">{p.target}</span>
                  </div>
                )}
                <p className="font-serif text-[15px] leading-[1.85] text-[var(--color-ink)] whitespace-pre-wrap mb-3">
                  {p.content}
                </p>
                {imgs.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {imgs.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt=""
                        className="h-20 w-20 object-cover rounded-[var(--radius-sm)]"
                      />
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--color-ink-muted)]">
                  <span className="flex items-center gap-2 flex-wrap">
                    {p.author ?? "匿名"} · {p.source} ·{" "}
                    {new Date(p.createdAt).toLocaleString("zh-CN")}
                    <AiBadge verdict={p.aiVerdict} reason={p.aiReason} />
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {p.status === "approved" && (
                      <button
                        onClick={() => togglePin(p.id, p.pinned)}
                        className={`px-3 py-1 rounded-full transition-colors ${
                          p.pinned
                            ? "bg-[var(--color-vermilion)]/10 text-[var(--color-vermilion-deep)] hover:bg-[var(--color-vermilion)]/20"
                            : "bg-[var(--color-vermilion)]/10 text-[var(--color-vermilion)] hover:bg-[var(--color-vermilion)]/20"
                        }`}
                      >
                        {p.pinned ? "取消置顶" : "置顶"}
                      </button>
                    )}
                    {p.status !== "approved" && (
                      <button
                        onClick={() => act(p.id, "approve")}
                        className="px-3 py-1 rounded-full bg-[var(--color-moss)]/10 text-[var(--color-moss)] hover:bg-[var(--color-moss)]/20 transition-colors"
                      >
                        通过
                      </button>
                    )}
                    {p.status !== "rejected" && (
                      <button
                        onClick={() => act(p.id, "reject")}
                        className="px-3 py-1 rounded-full bg-[var(--color-amber)]/10 text-[var(--color-amber)] hover:bg-[var(--color-amber)]/20 transition-colors"
                      >
                        拒绝
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("确定删除？")) act(p.id, "delete");
                      }}
                      className="px-3 py-1 rounded-full text-[var(--color-ink-muted)] hover:text-[var(--color-crimson)] transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
