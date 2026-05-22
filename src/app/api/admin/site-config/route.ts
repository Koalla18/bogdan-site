import { NextResponse } from "next/server";

import { siteConfigMutationSchema, validateJsonRequest } from "@/lib/api";
import { requireAdminApiSession } from "@/lib/admin-session";
import {
  getSiteConfigWithFallback,
  replaceSiteConfig,
  resetSiteConfig,
} from "@/lib/site-config-repository";
import { type SiteConfig } from "@/lib/site-config";
import { isSameOriginRequest } from "@/lib/security";

function toAdminPayload(config: SiteConfig) {
  return {
    concertsLabels: config.concertsLabels,
    colors: config.colors,
    concerts: config.concerts,
  };
}

export async function GET() {
  const { unauthorized } = await requireAdminApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const data = await getSiteConfigWithFallback();
    return NextResponse.json(
      { data: toAdminPayload(data) },
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

export async function PUT(request: Request) {
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

  const parsed = siteConfigMutationSchema.safeParse(payload);
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
    const current = await getSiteConfigWithFallback();
    const data = await replaceSiteConfig({
      ...current,
      concertsLabels: parsed.data.concertsLabels,
      colors: parsed.data.colors,
      concerts: parsed.data.concerts,
    });
    return NextResponse.json({ data: toAdminPayload(data) });
  } catch {
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

  const resetRequested =
    typeof payload === "object" &&
    payload !== null &&
    "action" in payload &&
    (payload as { action?: unknown }).action === "reset";

  if (!resetRequested) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  try {
    const data = await resetSiteConfig();
    return NextResponse.json({ data: toAdminPayload(data) });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
