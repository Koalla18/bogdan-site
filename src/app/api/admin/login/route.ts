import { NextResponse } from "next/server";
import { z } from "zod";

import { validateJsonRequest } from "@/lib/api";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  verifyAdminCredentials,
} from "@/lib/auth";
import {
  getRequestIp,
  isSameOriginRequest,
  shouldUseSecureCookies,
} from "@/lib/security";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(256),
});

const LOGIN_WINDOW_MS =
  Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MINUTES ?? "15") * 60 * 1000;
const MAX_LOGIN_FAILURES = Number(process.env.RATE_LIMIT_LOGIN_MAX ?? "5");
const LOGIN_BLOCK_MS = LOGIN_WINDOW_MS;

interface LoginAttempt {
  failures: number;
  resetAt: number;
  blockedUntil: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

function getAttemptKey(ip: string): string {
  return ip;
}

function registerFailure(attemptKey: string, now: number) {
  const existing = loginAttempts.get(attemptKey);

  if (!existing || existing.resetAt <= now) {
    loginAttempts.set(attemptKey, {
      failures: 1,
      resetAt: now + LOGIN_WINDOW_MS,
      blockedUntil: 0,
    });
    return;
  }

  const nextFailures = existing.failures + 1;
  loginAttempts.set(attemptKey, {
    failures: nextFailures,
    resetAt: existing.resetAt,
    blockedUntil:
      nextFailures >= MAX_LOGIN_FAILURES
        ? now + LOGIN_BLOCK_MS
        : existing.blockedUntil,
  });
}

function canAttemptLogin(
  attemptKey: string,
  now: number,
): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const existing = loginAttempts.get(attemptKey);

  if (!existing) {
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.resetAt <= now) {
    loginAttempts.delete(attemptKey);
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((existing.blockedUntil - now) / 1000),
      ),
    };
  }

  return { allowed: true, retryAfterSec: 0 };
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const validation = validateJsonRequest(request);
  if (validation.error) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status },
    );
  }

  const now = Date.now();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const ip = getRequestIp(request.headers);
  const attemptKey = getAttemptKey(ip);
  const attempt = canAttemptLogin(attemptKey, now);

  if (!attempt.allowed) {
    return NextResponse.json(
      {
        error: "Too many login attempts",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(attempt.retryAfterSec),
        },
      },
    );
  }

  const isValid = await verifyAdminCredentials(
    parsed.data.username,
    parsed.data.password,
  );

  if (!isValid) {
    registerFailure(attemptKey, now);
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  loginAttempts.delete(attemptKey);

  const token = createAdminSessionToken(parsed.data.username);
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");

  return response;
}
