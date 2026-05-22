import type { SiteContent } from "@/types/site";

interface SiteHeaderProps {
  artistName: SiteContent["artistName"];
}

export function SiteHeader({ artistName }: SiteHeaderProps) {
  return (
    <header className="hero-header" aria-label="Main navigation">
      <a href="#top" aria-label={artistName} className="hero-logo">
        B
      </a>

      <nav className="hero-nav">
        <a
          className="hero-nav-link"
          href="https://music.yandex.ru/artist/10863389"
          target="_blank"
          rel="noopener noreferrer"
        >
          Музыка
        </a>
        <a className="hero-nav-link" href="#concerts">
          Концерты
        </a>
      </nav>
    </header>
  );
}
