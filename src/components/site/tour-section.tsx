import type { CSSProperties } from "react";

import type { ConcertItem, SiteConfig } from "@/lib/site-config";

interface TourSectionProps {
  config: SiteConfig;
  concerts: ConcertItem[];
}

export function TourSection({ config, concerts }: TourSectionProps) {
  const liveStyle = {
    "--concert-bg": config.colors.concertBg,
    "--concert-date-color": config.colors.dateColor,
    "--concert-city-color": config.colors.cityColor,
    "--concert-subline-color": config.colors.sublineColor,
    "--concert-venue-color": config.colors.venueColor,
    "--concert-time-color": config.colors.timeColor,
    "--concert-button-border": config.colors.buttonBorderColor,
    "--concert-button-text": config.colors.buttonTextColor,
    "--concert-button-hover-bg": config.colors.buttonHoverBg,
    "--concert-button-hover-text": config.colors.buttonHoverText,
  } as CSSProperties;

  return (
    <section id="concerts" className="live-section" style={liveStyle}>
      <div className="live-container">
        <h2 className="live-title">LIVE 2026</h2>

        <div className="live-labels">
          <span>{config.concertsLabels.date}</span>
          <span>{config.concertsLabels.city}</span>
          <span>{config.concertsLabels.venue}</span>
          <span>{config.concertsLabels.time}</span>
          <span />
        </div>

        {concerts.map((concert, index) => (
          <div
            key={`${concert.date}-${concert.city}-${index}`}
            className="concert-row"
          >
            <div className="concert-date">{concert.date}</div>
            <div>
              <div className="concert-city">{concert.city}</div>
              {concert.subline ? (
                <div className="concert-sub">{concert.subline}</div>
              ) : null}
            </div>
            <div className="concert-venue">
              <span>{concert.venueLine1}</span>
              {concert.venueLine2 ? <span>{concert.venueLine2}</span> : null}
            </div>
            <div className="concert-time">{concert.time}</div>
            <a
              className="ticket-button"
              href={concert.ticketUrl || "#"}
              rel={
                (concert.ticketUrl || "#").startsWith("http")
                  ? "noopener noreferrer"
                  : undefined
              }
              target={
                (concert.ticketUrl || "#").startsWith("http")
                  ? "_blank"
                  : undefined
              }
            >
              {concert.ticketText || "КУПИТЬ БИЛЕТ"}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
