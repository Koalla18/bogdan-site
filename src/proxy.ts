import { NextRequest, NextResponse } from "next/server";

interface RateLimitRule {
  key: string;
  limit: number;
  windowMs: number;
  blockMs: number;
  matcher: RegExp;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil: number;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

const GLOBAL_API_LIMIT_PER_MINUTE = envInt("RATE_LIMIT_GLOBAL_PER_MINUTE", 120);
const ADMIN_API_LIMIT_PER_MINUTE = envInt("RATE_LIMIT_ADMIN_PER_MINUTE", 60);

const RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    key: "admin-api",
    matcher: /^\/api\/admin\/(?!login$)/,
    limit: ADMIN_API_LIMIT_PER_MINUTE,
    windowMs: 60_000,
    blockMs: 60_000,
  },
  {
    key: "public-api",
    matcher: /^\/api\//,
    limit: GLOBAL_API_LIMIT_PER_MINUTE,
    windowMs: 60_000,
    blockMs: 60_000,
  },
  {
    key: "admin-pages",
    matcher: /^\/admin(\/.*)?$/,
    limit: 180,
    windowMs: 60_000,
    blockMs: 60_000,
  },
];

const state = globalThis as unknown as {
  __branyaRateLimitStore?: Map<string, RateLimitEntry>;
  __branyaRateLimitCounter?: number;
};

function getRateLimitStore() {
  if (!state.__branyaRateLimitStore) {
    state.__branyaRateLimitStore = new Map();
  }

  return state.__branyaRateLimitStore;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "127.0.0.1";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "127.0.0.1";
}

function selectRateLimitRule(pathname: string): RateLimitRule | null {
  return RATE_LIMIT_RULES.find((rule) => rule.matcher.test(pathname)) ?? null;
}

function cleanupRateLimitStore(now: number) {
  state.__branyaRateLimitCounter = (state.__branyaRateLimitCounter ?? 0) + 1;
  if (state.__branyaRateLimitCounter % 100 !== 0) {
    return;
  }

  const store = getRateLimitStore();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now && entry.blockedUntil < now) {
      store.delete(key);
    }
  }
}

function applySecurityHeaders(response: NextResponse) {
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? "script-src 'self' 'unsafe-inline';"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval';";

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; img-src 'self' https: data:; media-src 'self' https: data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; ${scriptSrc} connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';`,
  );
}

function withRateLimitHeaders(
  response: NextResponse,
  rule: RateLimitRule,
  remaining: number,
  resetAt: number,
) {
  response.headers.set("X-RateLimit-Limit", String(rule.limit));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const rule = selectRateLimitRule(pathname);

  if (!rule) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  const now = Date.now();
  cleanupRateLimitStore(now);

  const clientIp = getClientIp(request);
  const store = getRateLimitStore();
  const storeKey = `${rule.key}:${clientIp}`;
  const existing = store.get(storeKey);

  let entry = existing;
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + rule.windowMs,
      blockedUntil: 0,
    };
  }

  if (entry.blockedUntil > now) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((entry.blockedUntil - now) / 1000),
    );

    const blockedResponse = pathname.startsWith("/api")
      ? NextResponse.json({ error: "Too many requests" }, { status: 429 })
      : new NextResponse("Too many requests", { status: 429 });

    blockedResponse.headers.set("Retry-After", String(retryAfterSec));
    withRateLimitHeaders(blockedResponse, rule, 0, entry.resetAt);
    applySecurityHeaders(blockedResponse);

    return blockedResponse;
  }

  entry.count += 1;

  if (entry.count > rule.limit) {
    entry.blockedUntil = now + rule.blockMs;
    store.set(storeKey, entry);

    const blockedResponse = pathname.startsWith("/api")
      ? NextResponse.json({ error: "Too many requests" }, { status: 429 })
      : new NextResponse("Too many requests", { status: 429 });

    blockedResponse.headers.set(
      "Retry-After",
      String(Math.ceil(rule.blockMs / 1000)),
    );
    withRateLimitHeaders(blockedResponse, rule, 0, entry.resetAt);
    applySecurityHeaders(blockedResponse);

    return blockedResponse;
  }

  store.set(storeKey, entry);

  const response = NextResponse.next();
  withRateLimitHeaders(response, rule, rule.limit - entry.count, entry.resetAt);
  applySecurityHeaders(response);

  if (pathname.startsWith("/api/admin")) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
