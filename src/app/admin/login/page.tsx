"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "登录失败");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <h1 className="font-serif text-3xl text-[var(--color-ink)] mb-2">管理入口</h1>
      <p className="text-sm text-[var(--color-ink-soft)] mb-8">
        输入管理密码进入。
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="管理密码"
          autoFocus
          className="w-full bg-[var(--color-paper-soft)] border border-[var(--color-line)] rounded-[var(--radius-sm)] px-4 py-3 text-sm focus:border-[var(--color-vermilion)] outline-none transition-colors"
        />
        {error && (
          <div className="text-sm text-[var(--color-crimson)]">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-5 py-3 rounded-full bg-[var(--color-vermilion)] text-[var(--color-paper)] hover:bg-[var(--color-vermilion-deep)] disabled:opacity-40 transition-colors text-sm font-medium"
        >
          {loading ? "进入…" : "进入"}
        </button>
      </form>
    </div>
  );
}
