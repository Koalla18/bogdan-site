import { Prisma, PrismaClient } from "@prisma/client";

import { DEFAULT_SITE_CONFIG, type ConcertItem } from "../src/lib/site-config";

const prisma = new PrismaClient();

function normalizeConcertForSeed(concert: ConcertItem, sortOrder: number) {
  return {
    date: concert.date,
    city: concert.city,
    subline: concert.subline || null,
    venueLine1: concert.venueLine1,
    venueLine2: concert.venueLine2 || null,
    time: concert.time,
    ticketText: concert.ticketText || "КУПИТЬ БИЛЕТ",
    ticketUrl: concert.ticketUrl || "#",
    enabled: concert.enabled,
    sortOrder,
  };
}

async function main() {
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
    update: {
      labels:
        DEFAULT_SITE_CONFIG.concertsLabels as unknown as Prisma.InputJsonValue,
      colors: DEFAULT_SITE_CONFIG.colors as unknown as Prisma.InputJsonValue,
      footer: DEFAULT_SITE_CONFIG.footer as unknown as Prisma.InputJsonValue,
    },
  });

  const existingConcerts = await prisma.concert.count();
  if (existingConcerts === 0) {
    await prisma.concert.createMany({
      data: DEFAULT_SITE_CONFIG.concerts.map((concert, index) =>
        normalizeConcertForSeed(concert, index + 1),
      ),
    });
  }

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
