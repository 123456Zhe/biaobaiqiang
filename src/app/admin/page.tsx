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

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "comments" | "words" | "announcements">("pending");
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [newWord, setNewWord] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && ["pending", "approved", "rejected", "comments", "words", "announcements"].includes(t)) {
      setTab(t as typeof tab);
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

  async function loadPosts(status: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/posts?status=${status}`);
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

  async function loadComments(status: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/comments?status=${status}`);
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

  useEffect(() => {
    if (!authed) return;
    if (tab === "words") loadWords();
    else if (tab === "comments") loadComments("approved");
    else if (tab === "announcements") loadAnnouncements();
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
    return <div className="max-w-5xl mx-auto px-6 py-12 text-[var(--color-ink-muted)]">…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl text-[var(--color-ink)]">管理后台</h1>
        <button
          onClick={logout}
          className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          退出
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 bg-[var(--color-paper-soft)] rounded-full border border-[var(--color-line)]/60 mb-8 w-fit text-sm flex-wrap">
        {(["pending", "approved", "rejected", "comments", "words", "announcements"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              tab === k
                ? "bg-[var(--color-paper)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
            }`}
          >
            {k === "pending" ? "待审" : k === "approved" ? "已通过" : k === "rejected" ? "已拒绝" : k === "comments" ? "评论" : k === "words" ? "词库" : "公告"}
          </button>
        ))}
      </div>

      {tab === "announcements" ? (
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
                <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
                  <span>
                    {new Date(a.createdAt).toLocaleString("zh-CN")} ·{" "}
                    {a.active ? "展示中" : "已下线"}
                  </span>
                  <div className="flex gap-2">
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
          {loading && <div className="text-[var(--color-ink-muted)] text-sm">…</div>}
          {!loading && comments.length === 0 && (
            <div className="text-center py-20 text-[var(--color-ink-muted)] text-sm">暂无评论</div>
          )}
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-5"
            >
              <p className="text-sm leading-relaxed text-[var(--color-ink)] whitespace-pre-wrap mb-3">
                {c.content}
              </p>
              <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
                <span>
                  {c.name ?? "匿名"} · 帖子 #{c.postId} ·{" "}
                  {new Date(c.createdAt).toLocaleString("zh-CN")}
                </span>
                <div className="flex items-center gap-2">
                  <AiBadge verdict={c.aiVerdict} reason={c.aiReason} />
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
          ))}
        </div>
      ) : (
        <div className="space-y-3">
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
                className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-5"
              >
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
                <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
                  <span className="flex items-center gap-2">
                    {p.author ?? "匿名"} · {p.source} ·{" "}
                    {new Date(p.createdAt).toLocaleString("zh-CN")}
                    <AiBadge verdict={p.aiVerdict} reason={p.aiReason} />
                  </span>
                  <div className="flex gap-2">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
