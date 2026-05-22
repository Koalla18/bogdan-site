import { NextResponse } from "next/server";

import { adminConcertUpdateSchema, validateJsonRequest } from "@/lib/api";
import { requireAdminApiSession } from "@/lib/admin-session";
import {
  deleteConcert,
  isDatabaseUnavailable,
  updateConcert,
} from "@/lib/site-config-repository";
import { isSameOriginRequest } from "@/lib/security";

function getConcertIdFromUrl(url: string): string | null {
  const pathname = new URL(url).pathname;
  const id = pathname.split("/").filter(Boolean).at(-1);

  return id ?? null;
}

async function handleUpdate(request: Request) {
  const { unauthorized } = await requireAdminApiSession();
  if (unauthorized) {
    return unauthorized;
  }

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

  const concertId = getConcertIdFromUrl(request.url);
  if (!concertId) {
    return NextResponse.json({ error: "Missing concert id" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminConcertUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const updated = await updateConcert(concertId, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Concert not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: "DB_UNAVAILABLE" }, { status: 503 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  return handleUpdate(request);
}

export async function PATCH(request: Request) {
  return handleUpdate(request);
}

export async function DELETE(request: Request) {
  const { unauthorized } = await requireAdminApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const concertId = getConcertIdFromUrl(request.url);
  if (!concertId) {
    return NextResponse.json({ error: "Missing concert id" }, { status: 400 });
  }

  try {
    const deleted = await deleteConcert(concertId);
    if (!deleted) {
      return NextResponse.json({ error: "Concert not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: "DB_UNAVAILABLE" }, { status: 503 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
