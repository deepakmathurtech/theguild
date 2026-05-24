// app/page.tsx

import GuildNavbar from "@/components/guild/GuildNavbar";
import Hero from "@/components/guild/Hero";
import {
  defaultDescription,
  pageMetadata,
  siteName,
  siteUrl,
  socialLinks,
} from "@/lib/site";

export const metadata = pageMetadata({
  title:
    "The Central Guild — Build Skills. Complete Quests. Grow Together.",
  description: defaultDescription,
  path: "/",
});

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: defaultDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/quests?search={search_term_string}`,
      "query-input":
        "required name=search_term_string",
    },
    about: [
      "Adventurers",
      "Quests",
      "Ranks",
      "Guild ID",
      "Community",
      "Verified contributions",
      "Learning by doing",
    ],
    sameAs: socialLinks
      .filter((link) =>
        link.href.startsWith("http")
      )
      .map((link) => link.href),
  };

  return (
    <main
      className="
        relative
        min-h-dvh
        overflow-x-hidden
        overflow-y-hidden
        bg-[#050505]
        text-white
      "
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(structuredData),
        }}
      />

      {/* Ambient Gold Glow */}
      <div
        className="
          absolute
          inset-0
          bg-[radial-gradient(circle_at_center,rgba(212,164,75,0.12),transparent_55%)]
        "
      />

      {/* Top Gradient */}
      <div
        className="
          absolute
          top-0
          h-72
          w-full
          bg-gradient-to-b
          from-yellow-900/10
          to-transparent
        "
      />

      {/* Navbar */}
      <GuildNavbar />

      {/* Hero */}
      <Hero />

      {/* Bottom Fade */}
      <div
        className="
          absolute
          bottom-0
          h-40
          w-full
          bg-gradient-to-t
          from-black
          to-transparent
        "
      />
    </main>
  );
}
