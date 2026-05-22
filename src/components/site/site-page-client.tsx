"use client";

import { useEffect, useMemo, useState } from "react";

import { BookingFooter } from "@/components/site/booking-footer";
import { HeroPosterSection } from "@/components/site/hero-poster-section";
import { SiteHeader } from "@/components/site/site-header";
import { TourSection } from "@/components/site/tour-section";
import {
  DEFAULT_SITE_CONFIG,
  normalizeSiteConfig,
  type SiteConfig,
} from "@/lib/site-config";
import type { SiteContent } from "@/types/site";

interface SitePageClientProps {
  artistName: SiteContent["artistName"];
  hero: SiteContent["hero"];
}

export function SitePageClient({ artistName, hero }: SitePageClientProps) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);

  useEffect(() => {
    let isMounted = true;

    async function fetchConfig() {
      try {
        const response = await fetch("/api/site-config", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data: SiteConfig };
        if (!isMounted) {
          return;
        }

        setConfig(normalizeSiteConfig(payload.data));
      } catch {
        // keep defaults when API is temporarily unavailable
      }
    }

    void fetchConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--concert-bg", config.colors.concertBg);
    root.style.setProperty("--concert-date-color", config.colors.dateColor);
    root.style.setProperty("--concert-city-color", config.colors.cityColor);
    root.style.setProperty(
      "--concert-subline-color",
      config.colors.sublineColor,
    );
    root.style.setProperty("--concert-venue-color", config.colors.venueColor);
    root.style.setProperty("--concert-time-color", config.colors.timeColor);
    root.style.setProperty(
      "--concert-button-border",
      config.colors.buttonBorderColor,
    );
    root.style.setProperty(
      "--concert-button-text",
      config.colors.buttonTextColor,
    );
    root.style.setProperty(
      "--concert-button-hover-bg",
      config.colors.buttonHoverBg,
    );
    root.style.setProperty(
      "--concert-button-hover-text",
      config.colors.buttonHoverText,
    );
  }, [config.colors]);

  const visibleConcerts = useMemo(
    () =>
      config.concerts
        .filter((concert) => concert.enabled)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [config.concerts],
  );

  return (
    <>
      <SiteHeader artistName={artistName} />
      <main className="flex flex-1 flex-col">
        <HeroPosterSection artistName={artistName} hero={hero} />
        <TourSection config={config} concerts={visibleConcerts} />
      </main>
      <BookingFooter artistName={artistName} />
    </>
  );
}
