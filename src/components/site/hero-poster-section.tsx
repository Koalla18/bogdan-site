import Image from "next/image";

import type { SiteContent } from "@/types/site";

interface HeroPosterSectionProps {
  artistName: SiteContent["artistName"];
  hero: SiteContent["hero"];
}

export function HeroPosterSection({
  artistName,
  hero,
}: HeroPosterSectionProps) {
  const title = (hero.title?.trim() || artistName).toUpperCase();

  return (
    <section id="top" className="hero-section">
      <div className="hero-soft-overlay" />
      <div className="hero-content">
        <h1 className="hero-title">{title}</h1>
        <div className="artist-wrap">
          <Image
            src="/artist.png"
            alt={`${artistName} portrait`}
            width={980}
            height={1100}
            priority
            className="artist"
            sizes="(max-width: 900px) 78vw, (max-width: 1400px) 38vw, 590px"
          />
        </div>
      </div>
    </section>
  );
}
