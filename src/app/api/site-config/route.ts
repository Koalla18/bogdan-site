import { NextResponse } from "next/server";

import { getSiteConfigWithFallback } from "@/lib/site-config-repository";

export async function GET() {
  try {
    const data = await getSiteConfigWithFallback();
    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
