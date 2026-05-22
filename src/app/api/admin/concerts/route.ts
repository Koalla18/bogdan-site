import { NextResponse } from "next/server";

import { adminConcertCreateSchema, validateJsonRequest } from "@/lib/api";
import { requireAdminApiSession } from "@/lib/admin-session";
import {
  createConcert,
  isDatabaseUnavailable,
  listConcertsForAdmin,
} from "@/lib/site-config-repository";
import { isSameOriginRequest } from "@/lib/security";

export async function GET() {
  const { unauthorized } = await requireAdminApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const concerts = await listConcertsForAdmin();
    return NextResponse.json({ data: concerts });
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

export async function POST(request: Request) {
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminConcertCreateSchema.safeParse(payload);
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
    const created = await createConcert(parsed.data);
    return NextResponse.json({ data: created }, { status: 201 });
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
