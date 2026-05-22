import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { AdminSessionPayload } from "@/lib/auth";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/auth";

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return verifyAdminSessionToken(token);
}

export async function requireAdminApiSession(): Promise<{
  session: AdminSessionPayload | null;
  unauthorized: NextResponse | null;
}> {
  const session = await getAdminSession();

  if (!session) {
    return {
      session: null,
      unauthorized: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  return {
    session,
    unauthorized: null,
  };
}
