import { NextRequest, NextResponse } from "next/server";

// 允许 App 端（Expo web 预览 / Web 发行版）跨域访问公开内容接口。
// 仅覆盖 posts / uploads，管理接口不在此列。
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-visitor-id",
  "Access-Control-Max-Age": "86400",
};

export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS });
  }
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(CORS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/api/posts/:path*", "/api/uploads/:path*"],
};
