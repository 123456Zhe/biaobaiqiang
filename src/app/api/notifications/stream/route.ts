import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listNotifications, unreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let audience: "admin" | "visitor";
  let visitorId: string | undefined;
  if (await isAdmin()) {
    audience = "admin";
  } else {
    visitorId = request.nextUrl.searchParams.get("visitorId") ?? undefined;
    if (!visitorId || !/^[a-zA-Z0-9-]{8,64}$/.test(visitorId)) {
      return new Response("unauthorized", { status: 401 });
    }
    audience = "visitor";
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastKey = "";
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };
      const tick = async () => {
        if (closed) return;
        try {
          const [items, unread] = await Promise.all([
            listNotifications({ audience, visitorId, take: 20 }),
            unreadCount({ audience, visitorId }),
          ]);
          const key = `${unread}:${items.map((n) => `${n.id}${n.read ? "r" : "u"}`).join(",")}`;
          if (key !== lastKey) {
            lastKey = key;
            send("snapshot", { unread, items: items.slice(0, 20) });
          } else {
            send("ping", {});
          }
        } catch (e) {
          console.error("sse tick error", e);
        }
      };
      await tick();
      const timer = setInterval(tick, 5000);
      const keepAlive = setInterval(() => {
        if (!closed) send("ping", {});
      }, 15000);
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(timer);
        clearInterval(keepAlive);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
