import type { Metadata } from "next";
import "./globals.css";

function getMetadataBase() {
  const fallback = "https://example.com";
  const candidate = process.env.SITE_PUBLIC_URL ?? fallback;

  try {
    return new URL(candidate);
  } catch {
    return new URL(fallback);
  }
}

const metadataBase = getMetadataBase();
const previewImage = new URL(
  "/branya_background_clean.png",
  metadataBase,
).toString();

export const metadata: Metadata = {
  metadataBase,
  title: "BRANYA | ПУСТО | LIVE 2026",
  description:
    "Официальный digital-постер BRANYA: новый релиз «Пусто», live 2026, музыка, визуальный мир и booking.",
  keywords: [
    "BRANYA",
    "Браня",
    "Пусто",
    "live 2026",
    "новый релиз",
    "темный поп",
    "artist website",
  ],
  openGraph: {
    title: "BRANYA | ПУСТО | LIVE 2026",
    description:
      "Новый релиз «Пусто» уже на площадках. Темный поп, ночные города и live 2026.",
    siteName: "BRANYA",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: previewImage,
        width: 1200,
        height: 630,
        alt: "BRANYA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BRANYA | ПУСТО | LIVE 2026",
    description: "Новый релиз «Пусто» уже на площадках.",
    images: [previewImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
