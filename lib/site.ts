import type { Metadata } from "next";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://thecentralguild.quest";

export const siteName =
  "The Central Guild";

export const guildContactEmail =
  "thecentralguild@gmail.com";

export const socialLinks = [
  {
    label: "Instagram",
    href:
      process.env
        .NEXT_PUBLIC_GUILD_INSTAGRAM ||
      "https://instagram.com/thecentralguild",
  },
  {
    label: "LinkedIn",
    href:
      process.env
        .NEXT_PUBLIC_GUILD_LINKEDIN ||
      "https://www.linkedin.com/company/thecentralguild",
  },
  {
    label: "X",
    href:
      process.env.NEXT_PUBLIC_GUILD_X ||
      "https://x.com/thecentralguild",
  },
  {
    label: "Email",
    href: `mailto:${guildContactEmail}`,
  },
];

export const defaultDescription =
  "The Central Guild turns learning, contribution, and personal growth into an interactive journey where Adventurers build real experience through verified Quests, Ranks, Guild ID profiles, and community collaboration.";

export const coreKeywords = [
  "The Central Guild",
  "Guild",
  "Adventurers",
  "Quests",
  "Guild ID",
  "Ranks",
  "Community",
  "verified contributions",
  "real-world projects",
  "skill building",
  "learning by doing",
  "public profile",
  "community-driven platform",
];

type PageMetaInput = {
  title: string;
  description?: string;
  path?: string;
};

export function pageMetadata({
  title,
  description = defaultDescription,
  path = "/",
}: PageMetaInput): Metadata {
  const canonical = new URL(
    path,
    siteUrl
  ).toString();

  return {
    title,
    description,
    keywords: coreKeywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title:
        title === siteName
          ? siteName
          : `${title} | ${siteName}`,
      description,
      url: canonical,
      siteName,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title:
        title === siteName
          ? siteName
          : `${title} | ${siteName}`,
      description,
      images: ["/og-image.png"],
    },
  };
}
