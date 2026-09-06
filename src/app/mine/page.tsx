"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVisitorId } from "@/components/NotificationBell";

type PostItem = {
  id: number;
  content: string;
  status: string;
  createdAt: string;
};

type CommentItem = {
  id: number;
  postId: number;
  content: string;
  status: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "未通过",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-[var(--color-amber)]/10 text-[var(--color-amber)]",
  approved: "bg-[var(--color-moss)]/10 text-[var(--color-moss)]",
  rejected: "bg-[var(--color-crimson)]/10 text-[var(--color-crimson)]",
};

export default function MinePage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "comments">("posts");

  useEffect(() => {
    fetch(`/api/posts/mine?visitorId=${encodeURIComponent(getVisitorId())}`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.items ?? []);
        setComments(d.comments ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="font-serif text-3xl text-[var(--color-ink)] mb-2">我的</h1>
      <p className="text-sm text-[var(--color-ink-muted)] mb-8">
        换设备后记录会丢失，仅保存在本机浏览器。
      </p>

      <div className="flex items-center gap-1 p-1 bg-[var(--color-paper-soft)] rounded-full border border-[var(--color-line)]/60 w-fit text-sm mb-8">
        {(["posts", "comments"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              tab === k
                ? "bg-[var(--color-paper)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
            }`}
          >
            {k === "posts" ? `投稿（${posts.length}）` : `评论（${comments.length}）`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-[var(--color-ink-muted)]">…</div>
      ) : tab === "posts" ? (
        posts.length === 0 ? (
          <Empty text="还没有投稿" link="/submit" linkText="写第一封" />
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li
                key={p.id}
                className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-5"
              >
                <p className="text-sm text-[var(--color-ink)] whitespace-pre-wrap break-words line-clamp-3 mb-3">
                  {p.content}
                </p>
                <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
                  <span className="flex items-center gap-2">
                    <Badge status={p.status} />
                    <span className="tabular-nums">
                      {new Date(p.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </span>
                  {p.status === "approved" ? (
                    <Link
                      href={`/post/${p.id}`}
                      className="text-[var(--color-vermilion)] hover:text-[var(--color-vermilion-deep)]"
                    >
                      查看 →
                    </Link>
                  ) : (
                    <span>#{p.id}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : comments.length === 0 ? (
        <Empty text="还没有评论" link="/" linkText="去墙上逛逛" />
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="bg-[var(--color-paper-soft)] border border-[var(--color-line)]/60 rounded-[var(--radius-card)] p-5"
            >
              <p className="text-sm text-[var(--color-ink)] whitespace-pre-wrap break-words mb-3">
                {c.content}
              </p>
              <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
                <span className="flex items-center gap-2">
                  <Badge status={c.status} />
                  <span className="tabular-nums">
                    {new Date(c.createdAt).toLocaleString("zh-CN")}
                  </span>
                </span>
                <Link
                  href={`/post/${c.postId}`}
                  className="text-[var(--color-vermilion)] hover:text-[var(--color-vermilion-deep)]"
                >
                  去原帖 →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${STATUS_CLASS[status] ?? STATUS_CLASS.pending}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Empty({ text, link, linkText }: { text: string; link: string; linkText: string }) {
  return (
    <div className="text-center py-20">
      <p className="font-serif text-xl text-[var(--color-ink-soft)] mb-4">{text}</p>
      <Link
        href={link}
        className="inline-block px-5 py-2 rounded-full bg-[var(--color-vermilion)] text-[var(--color-paper)] hover:bg-[var(--color-vermilion-deep)] transition-colors text-sm"
      >
        {linkText}
      </Link>
    </div>
  );
}
