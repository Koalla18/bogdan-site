import { Prisma, type Concert, type SiteSettings } from "@prisma/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SITE_CONFIG,
  normalizeSiteConfig,
  type ConcertItem,
  type SiteConfig,
} from "@/lib/site-config";

const ORDER_REBALANCE_OFFSET = 1_000_000;
const FILE_FALLBACK_PATH = path.join(
  process.cwd(),
  "data",
  "site-config.fallback.json",
);

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      error.code === "P1000" ||
      error.code === "P1001" ||
      error.code === "P1002" ||
      error.code === "P1010" ||
      error.code === "P2021" ||
      error.code === "P2022"
    );
  }

  return false;
}

function mapConcert(record: Concert): ConcertItem {
  return {
    id: record.id,
    enabled: record.enabled,
    date: record.date,
    city: record.city,
    subline: record.subline ?? "",
    venueLine1: record.venueLine1,
    venueLine2: record.venueLine2 ?? "",
    time: record.time,
    ticketText: record.ticketText || "КУПИТЬ БИЛЕТ",
    ticketUrl: record.ticketUrl || "#",
    sortOrder: record.sortOrder,
  };
}

type ConfigPayload = {
  concertsLabels: unknown;
  colors: unknown;
  footer: unknown;
  concerts: ConcertItem[];
};

function mapConfigPayloadToConfig(payload: ConfigPayload): SiteConfig {
  return normalizeSiteConfig({
    concertsLabels: payload.concertsLabels,
    colors: payload.colors,
    footer: payload.footer,
    concerts: payload.concerts,
  });
}

async function ensureSeeded() {
  await prisma.siteSettings.upsert({
    where: {
      id: 1,
    },
    create: {
      id: 1,
      labels:
        DEFAULT_SITE_CONFIG.concertsLabels as unknown as Prisma.InputJsonValue,
      colors: DEFAULT_SITE_CONFIG.colors as unknown as Prisma.InputJsonValue,
      footer: DEFAULT_SITE_CONFIG.footer as unknown as Prisma.InputJsonValue,
    },
    update: {},
  });

  const concertCount = await prisma.concert.count();
  if (concertCount > 0) {
    return;
  }

  await prisma.concert.createMany({
    data: DEFAULT_SITE_CONFIG.concerts.map((concert, index) => ({
      date: concert.date,
      city: concert.city,
      subline: concert.subline || null,
      venueLine1: concert.venueLine1,
      venueLine2: concert.venueLine2 || null,
      time: concert.time,
      ticketText: concert.ticketText || "КУПИТЬ БИЛЕТ",
      ticketUrl: concert.ticketUrl || "#",
      enabled: concert.enabled,
      sortOrder: index + 1,
    })),
  });
}

async function getRawConfig(): Promise<{
  settings: SiteSettings;
  concerts: ConcertItem[];
}> {
  await ensureSeeded();
  const [settings, concerts] = await Promise.all([
    prisma.siteSettings.findUniqueOrThrow({
      where: {
        id: 1,
      },
    }),
    prisma.concert.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return {
    settings,
    concerts: concerts.map(mapConcert),
  };
}

async function reorderByIdList(
  tx: Prisma.TransactionClient,
  orderedIds: string[],
) {
  await tx.concert.updateMany({
    data: {
      sortOrder: {
        increment: ORDER_REBALANCE_OFFSET,
      },
    },
  });

  for (const [index, id] of orderedIds.entries()) {
    await tx.concert.update({
      where: { id },
      data: { sortOrder: index + 1 },
    });
  }
}

function normalizeOrderTarget(value: number, max: number): number {
  return Math.max(1, Math.min(max, value));
}

function moveIdToPosition(
  ids: string[],
  id: string,
  targetPosition: number,
): string[] {
  const currentIndex = ids.findIndex((itemId) => itemId === id);
  if (currentIndex === -1) {
    return ids;
  }

  const next = [...ids];
  const [removed] = next.splice(currentIndex, 1);
  const targetIndex = normalizeOrderTarget(targetPosition, next.length + 1) - 1;
  next.splice(targetIndex, 0, removed);
  return next;
}

function sanitizeJsonField(
  value: Prisma.JsonValue,
  fallback: unknown,
): Record<string, unknown> {
  if (isObject(value)) {
    return value;
  }

  if (isObject(fallback)) {
    return fallback;
  }

  return {};
}

async function readFileFallbackConfig(): Promise<SiteConfig | null> {
  try {
    const raw = await readFile(FILE_FALLBACK_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeSiteConfig(parsed);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return null;
    }
    return null;
  }
}

async function writeFileFallbackConfig(config: SiteConfig): Promise<void> {
  await mkdir(path.dirname(FILE_FALLBACK_PATH), { recursive: true });
  await writeFile(FILE_FALLBACK_PATH, JSON.stringify(config, null, 2), "utf8");
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const { settings, concerts } = await getRawConfig();
  return mapConfigPayloadToConfig({
    concertsLabels: sanitizeJsonField(
      settings.labels,
      DEFAULT_SITE_CONFIG.concertsLabels,
    ),
    colors: sanitizeJsonField(settings.colors, DEFAULT_SITE_CONFIG.colors),
    footer: sanitizeJsonField(settings.footer, DEFAULT_SITE_CONFIG.footer),
    concerts,
  });
}

export async function getSiteConfigWithFallback(): Promise<SiteConfig> {
  try {
    return await getSiteConfig();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      const fallback = await readFileFallbackConfig();
      if (fallback) {
        return fallback;
      }
      const defaults = deepClone(DEFAULT_SITE_CONFIG);
      await writeFileFallbackConfig(defaults);
      return defaults;
    }

    throw error;
  }
}

export async function replaceSiteConfig(
  input: SiteConfig,
): Promise<SiteConfig> {
  const normalized = normalizeSiteConfig(input);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.siteSettings.upsert({
        where: {
          id: 1,
        },
        create: {
          id: 1,
          labels: normalized.concertsLabels as unknown as Prisma.InputJsonValue,
          colors: normalized.colors as unknown as Prisma.InputJsonValue,
          footer: normalized.footer as unknown as Prisma.InputJsonValue,
        },
        update: {
          labels: normalized.concertsLabels as unknown as Prisma.InputJsonValue,
          colors: normalized.colors as unknown as Prisma.InputJsonValue,
          footer: normalized.footer as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.concert.deleteMany();
      if (normalized.concerts.length > 0) {
        await tx.concert.createMany({
          data: normalized.concerts.map((concert, index) => ({
            date: concert.date,
            city: concert.city,
            subline: concert.subline || null,
            venueLine1: concert.venueLine1,
            venueLine2: concert.venueLine2 || null,
            time: concert.time,
            ticketText: concert.ticketText || "КУПИТЬ БИЛЕТ",
            ticketUrl: concert.ticketUrl || "#",
            enabled: concert.enabled,
            sortOrder: index + 1,
          })),
        });
      }
    });

    return getSiteConfig();
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }

    await writeFileFallbackConfig(normalized);
    return normalized;
  }
}

export async function resetSiteConfig(): Promise<SiteConfig> {
  return replaceSiteConfig(DEFAULT_SITE_CONFIG);
}

function normalizeConcertInput(input: ConcertItem): ConcertItem {
  const fallback = DEFAULT_SITE_CONFIG.concerts[0];
  const cleanText = (value: string, max: number, defaultValue: string) => {
    const normalized = value.replace(/[<>]/g, "").trim();
    if (normalized.length === 0) {
      return defaultValue;
    }

    return normalized.slice(0, max);
  };

  const cleanOptionalText = (value: string, max: number) =>
    value.replace(/[<>]/g, "").trim().slice(0, max);

  const sortOrder =
    Number.isInteger(input.sortOrder) && input.sortOrder > 0
      ? input.sortOrder
      : 1;

  return {
    enabled:
      typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    date: cleanText(input.date, 40, fallback.date),
    city: cleanText(input.city, 80, fallback.city),
    subline: cleanOptionalText(input.subline ?? "", 80),
    venueLine1: cleanText(input.venueLine1, 120, fallback.venueLine1),
    venueLine2: cleanOptionalText(input.venueLine2 ?? "", 120),
    time: cleanText(input.time, 20, fallback.time),
    ticketText: cleanText(input.ticketText ?? "", 40, "КУПИТЬ БИЛЕТ"),
    ticketUrl: input.ticketUrl?.trim() ? input.ticketUrl.trim() : "#",
    sortOrder,
  };
}

export async function listConcertsForAdmin(): Promise<ConcertItem[]> {
  const config = await getSiteConfigWithFallback();
  return [...config.concerts].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createConcert(input: ConcertItem): Promise<ConcertItem> {
  const normalizedInput = normalizeConcertInput(input);

  const created = await prisma.$transaction(async (tx) => {
    const totalCount = await tx.concert.count();
    const targetOrder = normalizeOrderTarget(
      normalizedInput.sortOrder || totalCount + 1,
      totalCount + 1,
    );

    const record = await tx.concert.create({
      data: {
        date: normalizedInput.date,
        city: normalizedInput.city,
        subline: normalizedInput.subline || null,
        venueLine1: normalizedInput.venueLine1,
        venueLine2: normalizedInput.venueLine2 || null,
        time: normalizedInput.time,
        ticketText: normalizedInput.ticketText || "КУПИТЬ БИЛЕТ",
        ticketUrl: normalizedInput.ticketUrl || "#",
        enabled: normalizedInput.enabled,
        sortOrder: totalCount + 1,
      },
    });

    const ids = (
      await tx.concert.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      })
    ).map((item) => item.id);

    const reorderedIds = moveIdToPosition(ids, record.id, targetOrder);
    await reorderByIdList(tx, reorderedIds);

    return tx.concert.findUniqueOrThrow({
      where: {
        id: record.id,
      },
    });
  });

  return mapConcert(created);
}

export async function updateConcert(
  id: string,
  input: Partial<ConcertItem>,
): Promise<ConcertItem | null> {
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.concert.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      return null;
    }

    const merged = normalizeConcertInput({
      ...mapConcert(existing),
      ...input,
      sortOrder:
        typeof input.sortOrder === "number"
          ? input.sortOrder
          : existing.sortOrder,
    });

    await tx.concert.update({
      where: {
        id,
      },
      data: {
        date: merged.date,
        city: merged.city,
        subline: merged.subline || null,
        venueLine1: merged.venueLine1,
        venueLine2: merged.venueLine2 || null,
        time: merged.time,
        ticketText: merged.ticketText || "КУПИТЬ БИЛЕТ",
        ticketUrl: merged.ticketUrl || "#",
        enabled: merged.enabled,
      },
    });

    const orderedIds = (
      await tx.concert.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      })
    ).map((item) => item.id);

    const reorderedIds = moveIdToPosition(
      orderedIds,
      id,
      normalizeOrderTarget(merged.sortOrder, orderedIds.length),
    );
    await reorderByIdList(tx, reorderedIds);

    return tx.concert.findUniqueOrThrow({
      where: {
        id,
      },
    });
  });

  return updated ? mapConcert(updated) : null;
}

export async function deleteConcert(id: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.concert.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      return false;
    }

    await tx.concert.delete({
      where: {
        id,
      },
    });

    const remainingIds = (
      await tx.concert.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      })
    ).map((concert) => concert.id);
    await reorderByIdList(tx, remainingIds);

    return true;
  });
}
