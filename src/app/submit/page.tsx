"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getVisitorId } from "@/components/NotificationBell";
import { TAGS } from "@/lib/tags";

export default function SubmitPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [target, setTarget] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [tag, setTag] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const remain = 1000 - content.length;

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).slice(0, 9);
    setFiles(arr);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!content.trim()) {
      setError("说点什么吧。");
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.set("content", content.trim());
    fd.set("visitorId", getVisitorId());
    if (!anonymous && author.trim()) fd.set("author", author.trim());
    if (target.trim()) fd.set("target", target.trim());
    if (tag) fd.set("tag", tag);
    files.forEach((f) => fd.append("images", f));
    try {
      const res = await fetch("/api/posts", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "提交失败");
      } else {
        setDone(true);
      }
    } catch {
      setError("网络异常，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-vermilion-soft)] text-[var(--color-vermilion-deep)] mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-serif text-3xl text-[var(--color-ink)] mb-3">已经贴上去了</h2>
        <p className="text-[var(--color-ink-soft)] mb-8">
          审核通过后就会出现在墙上。
        </p>
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => {
              setDone(false);
              setContent("");
              setAuthor("");
              setTarget("");
              setFiles([]);
              setAnonymous(false);
              setTag("");
            }}
            className="px-5 py-2 rounded-full border border-[var(--color-line)] hover:border-[var(--color-ink-muted)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
          >
            再写一封
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-5 py-2 rounded-full bg-[var(--color-vermilion)] text-[var(--color-paper)] hover:bg-[var(--color-vermilion-deep)] transition-colors"
          >
            去墙上看看
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-ink)] mb-3">写一封</h1>
        <p className="text-[var(--color-ink-soft)] text-sm">想写给谁，想说什么，写下来就好。</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 1000))}
            placeholder="今天阳光很好，遇见你真好。"
            rows={8}
            className="w-full bg-transparent font-serif text-lg leading-[1.9] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)]/60 border-b border-[var(--color-line)] focus:border-[var(--color-vermilion)] outline-none py-3 resize-none transition-colors"
          />
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-[var(--color-ink-muted)]">
              审核通过后会展示在墙上
            </span>
            <span
              className={`tabular-nums ${
                remain < 0
                  ? "text-[var(--color-crimson)]"
                  : remain < 100
                  ? "text-[var(--color-amber)]"
                  : "text-[var(--color-ink-muted)]"
              }`}
            >
              {remain >= 0 ? `还剩 ${remain} 字` : `超出 ${-remain} 字`}
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs text-[var(--color-ink-muted)] mb-2">写给谁（可选）</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="比如：图书馆的那个她"
              disabled={anonymous}
              className="w-full bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-[var(--radius-sm)] px-4 py-2.5 text-sm focus:border-[var(--color-vermilion)] outline-none transition-colors disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-ink-muted)] mb-2">署名（可选）</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="留空即匿名"
              disabled={anonymous}
              className="w-full bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-[var(--radius-sm)] px-4 py-2.5 text-sm focus:border-[var(--color-vermilion)] outline-none transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-vermilion)]"
          />
          完全匿名（不会留下任何署名信息）
        </label>

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-2">分类（可选）</label>
          <div className="flex items-center gap-1 p-1 bg-[var(--color-paper-soft)] rounded-full border border-[var(--color-line)]/60 w-fit text-sm flex-wrap">
            {["", ...TAGS].map((t) => (
              <button
                key={t || "none"}
                type="button"
                onClick={() => setTag(t)}
                className={`px-4 py-1.5 rounded-full transition-colors ${
                  tag === t
                    ? "bg-[var(--color-paper)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
                }`}
              >
                {t || "不分类"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-2">
            添加图片（最多 9 张，jpg/png/webp，每张 ≤ 5MB）
          </label>
          <label className="block border border-dashed border-[var(--color-line)] rounded-[var(--radius-sm)] p-5 text-center cursor-pointer hover:border-[var(--color-ink-muted)] hover:bg-[var(--color-paper-soft)] transition-colors">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <span className="text-sm text-[var(--color-ink-soft)]">
              {files.length > 0
                ? `已选 ${files.length} 张 · ${files.map((f) => f.name).join("、")}`
                : "点击选择图片"}
            </span>
          </label>
          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="text-xs px-2 py-1 bg-[var(--color-paper-soft)] rounded-[var(--radius-sm)] text-[var(--color-ink-soft)] flex items-center gap-2"
                >
                  {f.name}
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-crimson)]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-[var(--color-crimson)] bg-[var(--color-crimson)]/5 border border-[var(--color-crimson)]/20 rounded-[var(--radius-sm)] px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[var(--color-ink-muted)]">
            每 10 分钟最多 3 条
          </span>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-7 py-2.5 rounded-full bg-[var(--color-vermilion)] text-[var(--color-paper)] hover:bg-[var(--color-vermilion-deep)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {submitting ? "正在贴上…" : "贴上墙"}
          </button>
        </div>
      </form>
    </div>
  );
}
