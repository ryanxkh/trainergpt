import { auth } from "@/lib/auth";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Rate limiter for /api/chat — 20 requests per minute per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
});

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Rate limit the AI chat endpoint
  if (pathname === "/api/chat") {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return new NextResponse("Too many requests. Please slow down.", {
        status: 429,
        headers: { "X-RateLimit-Remaining": remaining.toString() },
      });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and public assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
