import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_PROXY_URL || "http://api:4000";

async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/^\/api/, "");
  const target = `${API_URL}/api${pathname}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key !== "host" && key !== "content-length") headers.set(key, value);
  });
  headers.set("host", new URL(API_URL).host);

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
  });

  const body = response.status === 204 ? null : await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
