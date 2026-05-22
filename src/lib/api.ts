import { z } from "zod";

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MAX_JSON_BODY_BYTES = 100 * 1024;

function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, "").trim();
}

function isSafeHttpUrl(value: string): boolean {
  if (value === "#") {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .transform((value) => sanitizeText(value));

const optionalSafeText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => sanitizeText(value))
    .optional()
    .default("");

const siteConcertSchema = z.object({
  enabled: z.boolean(),
  date: safeText(40),
  city: safeText(80),
  subline: optionalSafeText(80),
  venueLine1: safeText(120),
  venueLine2: optionalSafeText(120),
  time: safeText(20),
  ticketText: optionalSafeText(40).transform((value) =>
    value.length > 0 ? value : "КУПИТЬ БИЛЕТ",
  ),
  ticketUrl: z
    .string()
    .trim()
    .max(2048)
    .transform((value) => (value.length > 0 ? value : "#"))
    .refine(isSafeHttpUrl, "Ticket URL must be # or valid http(s) URL"),
  sortOrder: z.number().int().min(1),
});

export const adminConcertCreateSchema = siteConcertSchema;

export const adminConcertUpdateSchema = siteConcertSchema
  .partial()
  .refine(
    (payload) => Object.keys(payload).length > 0,
    "Patch payload should include at least one field",
  );

const concertsLabelsSchema = z.object({
  date: safeText(30),
  city: safeText(30),
  venue: safeText(30),
  time: safeText(30),
});

const colorsSchema = z.object({
  concertBg: z.string().trim().regex(HEX_COLOR_REGEX),
  dateColor: z.string().trim().regex(HEX_COLOR_REGEX),
  cityColor: z.string().trim().regex(HEX_COLOR_REGEX),
  sublineColor: z.string().trim().regex(HEX_COLOR_REGEX),
  venueColor: z.string().trim().regex(HEX_COLOR_REGEX),
  timeColor: z.string().trim().regex(HEX_COLOR_REGEX),
  buttonBorderColor: z.string().trim().regex(HEX_COLOR_REGEX),
  buttonTextColor: z.string().trim().regex(HEX_COLOR_REGEX),
  buttonHoverBg: z.string().trim().regex(HEX_COLOR_REGEX),
  buttonHoverText: z.string().trim().regex(HEX_COLOR_REGEX),
});

export const siteConfigMutationSchema = z.object({
  concertsLabels: concertsLabelsSchema,
  colors: colorsSchema,
  concerts: z
    .array(siteConcertSchema)
    .min(1)
    .max(200)
    .transform((concerts) =>
      concerts
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((concert, index) => ({
          ...concert,
          sortOrder: index + 1,
        })),
    ),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export function parsePaginationParams(url: URL) {
  const parsed = paginationSchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return {
      limit: 50,
      offset: 0,
    };
  }

  return parsed.data;
}

export function validateJsonRequest(request: Request): {
  error: string | null;
  status: number;
} {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      error: "Unsupported content type",
      status: 415,
    };
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
      return {
        error: "Payload too large",
        status: 413,
      };
    }
  }

  return {
    error: null,
    status: 200,
  };
}
