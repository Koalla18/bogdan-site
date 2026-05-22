export interface ConcertLabels {
  date: string;
  city: string;
  venue: string;
  time: string;
}

export interface SiteColors {
  concertBg: string;
  dateColor: string;
  cityColor: string;
  sublineColor: string;
  venueColor: string;
  timeColor: string;
  buttonBorderColor: string;
  buttonTextColor: string;
  buttonHoverBg: string;
  buttonHoverText: string;
}

export interface ConcertItem {
  id?: string;
  enabled: boolean;
  date: string;
  city: string;
  subline: string;
  venueLine1: string;
  venueLine2: string;
  time: string;
  ticketText: string;
  ticketUrl: string;
  sortOrder: number;
}

export interface FooterSettings {
  bookingEmail: string;
  vk: string;
  tg: string;
  instagram: string;
}

export interface SiteConfig {
  concertsLabels: ConcertLabels;
  colors: SiteColors;
  concerts: ConcertItem[];
  footer: FooterSettings;
}

export const COLOR_PRESETS = [
  { name: "Gold", value: "#D89A2B" },
  { name: "Orange", value: "#E85D04" },
  { name: "Red", value: "#D62828" },
  { name: "Pink", value: "#DB2777" },
  { name: "Purple", value: "#7C3AED" },
  { name: "Blue", value: "#2563EB" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Green", value: "#16A34A" },
  { name: "White", value: "#F2F2F2" },
  { name: "Gray", value: "#8E8E93" },
] as const;

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  concertsLabels: {
    date: "Дата",
    city: "Город",
    venue: "Место",
    time: "Время",
  },
  colors: {
    concertBg: "#0B0B0D",
    dateColor: "#D89A2B",
    cityColor: "#D89A2B",
    sublineColor: "#F2F2F2",
    venueColor: "#8E8E93",
    timeColor: "#F2F2F2",
    buttonBorderColor: "#F2F2F2",
    buttonTextColor: "#F2F2F2",
    buttonHoverBg: "#F2F2F2",
    buttonHoverText: "#0B0B0D",
  },
  concerts: [
    {
      enabled: true,
      date: "16 ИЮЛ",
      city: "МОСКВА",
      subline: "+ LIVE BAND",
      venueLine1: "RED SUMMER MCK",
      venueLine2: "(РЕД САММЭР)",
      time: "20:00",
      ticketText: "КУПИТЬ БИЛЕТ",
      ticketUrl: "#",
      sortOrder: 1,
    },
    {
      enabled: true,
      date: "24 ИЮЛ",
      city: "САМАРА",
      subline: "+ LIVE BAND",
      venueLine1: "ROOF LIVE",
      venueLine2: "(РУФ ЛАЙВ)",
      time: "20:00",
      ticketText: "КУПИТЬ БИЛЕТ",
      ticketUrl: "#",
      sortOrder: 2,
    },
    {
      enabled: true,
      date: "26 ИЮЛ",
      city: "КАЗАНЬ",
      subline: "+ LIVE BAND",
      venueLine1: "ROOF PLACE",
      venueLine2: "(РУФ ПЛЕЙС)",
      time: "20:00",
      ticketText: "КУПИТЬ БИЛЕТ",
      ticketUrl: "#",
      sortOrder: 3,
    },
    {
      enabled: true,
      date: "31 АВГ",
      city: "САНКТ-ПЕТЕРБУРГ",
      subline: "+ LIVE BAND",
      venueLine1: "ROOF PLACE",
      venueLine2: "(РУФ ПЛЕЙС)",
      time: "20:00",
      ticketText: "КУПИТЬ БИЛЕТ",
      ticketUrl: "#",
      sortOrder: 4,
    },
  ],
  footer: {
    bookingEmail: "info@goldensound.ru",
    vk: "https://vk.com/al_artist.php?artist_id=branya",
    tg: "https://t.me/branyaaaa222",
    instagram: "https://www.instagram.com/branyaaaa/",
  },
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function readStringAllowEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readPositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return value;
}

function normalizeConcert(item: unknown, fallback: ConcertItem): ConcertItem {
  if (!isObject(item)) {
    return { ...fallback };
  }

  const ticketText = readString(item.ticketText, fallback.ticketText);
  const ticketUrlRaw = readStringAllowEmpty(item.ticketUrl);

  return {
    id: typeof item.id === "string" ? item.id : undefined,
    enabled: readBoolean(item.enabled, fallback.enabled),
    date: readString(item.date, fallback.date),
    city: readString(item.city, fallback.city),
    subline: readStringAllowEmpty(item.subline),
    venueLine1: readString(item.venueLine1, fallback.venueLine1),
    venueLine2: readStringAllowEmpty(item.venueLine2),
    time: readString(item.time, fallback.time),
    ticketText,
    ticketUrl: ticketUrlRaw.length > 0 ? ticketUrlRaw : "#",
    sortOrder: readPositiveInteger(item.sortOrder, fallback.sortOrder),
  };
}

export function normalizeSiteConfig(raw: unknown): SiteConfig {
  const defaults = deepClone(DEFAULT_SITE_CONFIG);
  if (!isObject(raw)) {
    return defaults;
  }

  const labels = isObject(raw.concertsLabels) ? raw.concertsLabels : {};
  const colors = isObject(raw.colors) ? raw.colors : {};
  const footer = isObject(raw.footer) ? raw.footer : {};

  const concertsSource = Array.isArray(raw.concerts)
    ? raw.concerts
    : defaults.concerts;
  const concerts = concertsSource
    .map((item, index) =>
      normalizeConcert(
        item,
        defaults.concerts[Math.min(index, defaults.concerts.length - 1)],
      ),
    )
    .filter((item) => item.date.length > 0 && item.city.length > 0)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item, index) => ({
      ...item,
      sortOrder: index + 1,
    }));

  return {
    concertsLabels: {
      date: readString(labels.date, defaults.concertsLabels.date),
      city: readString(labels.city, defaults.concertsLabels.city),
      venue: readString(labels.venue, defaults.concertsLabels.venue),
      time: readString(labels.time, defaults.concertsLabels.time),
    },
    colors: {
      concertBg: readString(
        colors.concertBg ?? colors.background,
        defaults.colors.concertBg,
      ),
      dateColor: readString(
        colors.dateColor ?? colors.accent,
        defaults.colors.dateColor,
      ),
      cityColor: readString(
        colors.cityColor ?? colors.accent,
        defaults.colors.cityColor,
      ),
      sublineColor: readString(
        colors.sublineColor ?? colors.text,
        defaults.colors.sublineColor,
      ),
      venueColor: readString(
        colors.venueColor ?? colors.muted,
        defaults.colors.venueColor,
      ),
      timeColor: readString(
        colors.timeColor ?? colors.text,
        defaults.colors.timeColor,
      ),
      buttonBorderColor: readString(
        colors.buttonBorderColor ?? colors.buttonBorder,
        defaults.colors.buttonBorderColor,
      ),
      buttonTextColor: readString(
        colors.buttonTextColor ?? colors.buttonText,
        defaults.colors.buttonTextColor,
      ),
      buttonHoverBg: readString(
        colors.buttonHoverBg,
        defaults.colors.buttonHoverBg,
      ),
      buttonHoverText: readString(
        colors.buttonHoverText,
        defaults.colors.buttonHoverText,
      ),
    },
    concerts: concerts.length > 0 ? concerts : defaults.concerts,
    footer: {
      bookingEmail: readString(
        footer.bookingEmail,
        defaults.footer.bookingEmail,
      ),
      vk: readString(footer.vk, defaults.footer.vk),
      tg: readString(footer.tg, defaults.footer.tg),
      instagram: readString(footer.instagram, defaults.footer.instagram),
    },
  };
}
