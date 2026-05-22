import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      username: session.sub,
      expiresAt: session.exp,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
