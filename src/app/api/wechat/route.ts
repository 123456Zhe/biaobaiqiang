import { NextRequest } from "next/server";
import { checkSignature } from "@/lib/wechat/sign";
import {
  buildTextReply,
  parseIncomingXml,
  EMPTY_SUCCESS,
  IncomingMessage,
} from "@/lib/wechat/xml";
import { handleMessage } from "@/lib/wechat/handlers";
import { seedSensitiveWords } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN = process.env.WECHAT_TOKEN ?? "";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const signature = searchParams.get("signature") ?? "";
  const timestamp = searchParams.get("timestamp") ?? "";
  const nonce = searchParams.get("nonce") ?? "";
  const echostr = searchParams.get("echostr") ?? "";

  if (!TOKEN) {
    return new Response("wechat token not configured", { status: 500 });
  }
  if (checkSignature({ token: TOKEN, signature, timestamp, nonce })) {
    return new Response(echostr);
  }
  return new Response("invalid signature", { status: 403 });
}

export async function POST(request: NextRequest) {
  await seedSensitiveWords();
  const { searchParams } = request.nextUrl;
  const signature = searchParams.get("signature") ?? "";
  const timestamp = searchParams.get("timestamp") ?? "";
  const nonce = searchParams.get("nonce") ?? "";

  if (TOKEN && !checkSignature({ token: TOKEN, signature, timestamp, nonce })) {
    return new Response("invalid signature", { status: 403 });
  }

  const xml = await request.text();
  const msg: IncomingMessage | null = parseIncomingXml(xml);
  if (!msg) {
    return new Response(EMPTY_SUCCESS, { headers: { "content-type": "text/plain" } });
  }

  try {
    const result = await handleMessage(msg);
    if (!result.content) {
      return new Response(EMPTY_SUCCESS, { headers: { "content-type": "text/plain" } });
    }
    const reply = buildTextReply({
      toUser: msg.FromUserName,
      fromUser: msg.ToUserName,
      content: result.content,
    });
    return new Response(reply, { headers: { "content-type": "application/xml" } });
  } catch (e) {
    console.error("wechat handle error", e);
    return new Response(EMPTY_SUCCESS, { headers: { "content-type": "text/plain" } });
  }
}
