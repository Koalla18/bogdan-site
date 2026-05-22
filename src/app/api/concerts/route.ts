import { NextResponse } from "next/server";

import { parsePaginationParams } from "@/lib/api";
import { getSiteConfigWithFallback } from "@/lib/site-config-repository";

export async function GET(request: Request) {
  try {
    const { limit, offset } = parsePaginationParams(new URL(request.url));
    const config = await getSiteConfigWithFallback();
    const concerts = config.concerts
      .filter((concert) => concert.enabled)
      .sort((left, right) => left.sortOrder - right.sortOrder);

    return NextResponse.json({
      data: concerts.slice(offset, offset + limit),
      meta: {
        limit,
        offset,
        total: concerts.length,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
