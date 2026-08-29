"use client";

import { useEffect, useState } from "react";

type PushState =
  | "checking"
  | "unsupported"
  | "insecure"
  | "denied"
  | "off"
  | "on";

function b64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState>("checking");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (location.protocol !== "https:") {
        setState("insecure");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const res = await fetch("/api/push/subscribe");
    const { key } = await res.json();
    if (!key) return;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState("denied");
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToUint8Array(key),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        visitorId: localStorage.getItem("visitor_id"),
      }),
    });
    setState("on");
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    }
    setState("off");
  }

  if (state === "checking" || state === "unsupported") return null;

  if (state === "insecure") {
    return compact ? null : (
      <p className="text-xs text-[var(--color-ink-muted)]">
        浏览器推送需要 HTTPS 访问后才能开启
      </p>
    );
  }

  const label =
    state === "on"
      ? "关闭浏览器推送"
      : state === "denied"
      ? "推送已被浏览器禁用"
      : "开启离线推送";

  return (
    <button
      onClick={state === "on" ? disable : enable}
      disabled={state === "denied"}
      className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-vermilion-deep)] disabled:text-[var(--color-ink-muted)] disabled:cursor-not-allowed transition-colors"
    >
      {label}
    </button>
  );
}
