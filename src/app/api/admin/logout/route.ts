import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-session";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { isSameOriginRequest, shouldUseSecureCookies } from "@/lib/security";

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");

  return response;
}
