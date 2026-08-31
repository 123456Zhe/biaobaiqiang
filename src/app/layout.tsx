import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";

const serif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif-cn",
  display: "swap",
});

const sans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans-cn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "白墙 · 校园表白墙",
  description: "把想说的话，轻轻贴上墙。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="font-serif text-2xl font-semibold tracking-wide text-[var(--color-ink)] hover:text-[var(--color-vermilion-deep)] transition-colors"
            >
              <span className="text-[var(--color-vermilion)]">白</span>墙
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NotificationBell />
              <Link
                href="/"
                className="px-3 py-2 rounded-full text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-soft)] transition-colors"
              >
                墙上
              </Link>
              <Link
                href="/submit"
                className="px-4 py-2 rounded-full bg-[var(--color-vermilion)] text-[var(--color-paper)] hover:bg-[var(--color-vermilion-deep)] transition-colors"
              >
                写一封
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[var(--color-line)] mt-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-sm text-[var(--color-ink-muted)] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <span className="font-serif text-[var(--color-ink-soft)]">
              把想说的话，轻轻贴上墙。
            </span>
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="hover:text-[var(--color-ink)] transition-colors"
              >
                管理入口
              </Link>
              <span>·</span>
              <span>© {new Date().getFullYear()} White Wall</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
