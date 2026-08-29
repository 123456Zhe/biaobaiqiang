import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    pub,
    priv,
  );
  configured = true;
  return true;
}

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export type PushPayload = {
  title: string;
  body?: string | null;
  url?: string | null;
  tag?: string;
};

export async function pushTo(opts: {
  audience: "visitor" | "admin";
  visitorId?: string | null;
  payload: PushPayload;
}) {
  if (!ensureConfigured()) return;
  const subs = await prisma.pushSubscription.findMany({
    where:
      opts.audience === "admin"
        ? { audience: "admin" }
        : { audience: "visitor", visitorId: opts.visitorId ?? undefined },
  });
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(opts.payload),
        );
      } catch (e) {
        const err = e as { statusCode?: number };
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    }),
  );
}
