import { SitePageClient } from "@/components/site/site-page-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <SitePageClient
      artistName="BRANYA"
      hero={{
        title: "BRANYA",
        subtitle: "golden sound 2026",
        artistImageUrl: "/artist.png",
      }}
    />
  );
}
