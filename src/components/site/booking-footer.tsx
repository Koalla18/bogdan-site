import Image from "next/image";

import type { SiteContent } from "@/types/site";
const BOOKING_EMAIL = "info@goldensound.ru";
const SOCIALS = [
  { key: "tg", label: "TG", href: "https://t.me/branyaaaa222" },
  {
    key: "vk",
    label: "VK",
    href: "https://vk.com/al_artist.php?artist_id=branya",
  },
  {
    key: "instagram",
    label: "INSTAGRAM",
    href: "https://www.instagram.com/branyaaaa/",
  },
] as const;

interface BookingFooterProps {
  artistName: SiteContent["artistName"];
}

export function BookingFooter({ artistName }: BookingFooterProps) {
  return (
    <footer id="booking" className="footer">
      <div className="footer-inner">
        <div className="footer-brand-stack">
          <div className="footer-brand">{artistName}</div>
          <Image
            src="/photo/golden-sound.png"
            alt="Golden Sound"
            className="footer-label-logo"
            width={130}
            height={46}
          />
        </div>
        <div className="footer-info">
          <div>
            <a href={`mailto:${BOOKING_EMAIL}`}>BOOKING: {BOOKING_EMAIL}</a>
          </div>
        </div>
        <div className="footer-socials">
          {SOCIALS.map((social) => (
            <a
              key={social.key}
              href={social.href}
              rel={
                social.href.startsWith("http")
                  ? "noopener noreferrer"
                  : undefined
              }
              target={social.href.startsWith("http") ? "_blank" : undefined}
            >
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
