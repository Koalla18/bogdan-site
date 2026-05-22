import { compare } from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

export const ADMIN_SESSION_COOKIE = "branya_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

export interface AdminSessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function createSignature(encodedPayload: string): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

function secureStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  if (!secureStringEqual(username, env.ADMIN_USERNAME)) {
    return false;
  }

  if (env.ADMIN_PASSWORD_HASH) {
    return compare(password, env.ADMIN_PASSWORD_HASH);
  }

  if (!env.ADMIN_PASSWORD) {
    return false;
  }

  return secureStringEqual(password, env.ADMIN_PASSWORD);
}

export function createAdminSessionToken(username: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: username,
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
): AdminSessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(encodedPayload);

  if (!secureStringEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(encodedPayload),
    ) as AdminSessionPayload;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
