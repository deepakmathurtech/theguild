import type { Metadata } from "next";
import "./globals.css";

import {
  GuildAuthProvider,
} from "@/components/guild/GuildAuthLogic";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://thecentralguild.quest"
  ),

  title: {
    default: "The Central Guild",
    template: "%s | The Central Guild",
  },

  description:
    "Enter as unknown. Leave as legend. A quest-driven adventurer association where members build skills, complete real-world quests, and grow with their city guild.",

  keywords: [
    "The Central Guild",
    "Guild",
    "quests",
    "adventurer",
    "quest community",
    "guild card",
    "guild registry",
    "skill building",
    "student community",
    "city guild",
  ],

  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },

  openGraph: {
    title: "The Central Guild",
    description:
      "Enter as unknown. Leave as legend.",

    url:
      "https://thecentralguild.quest",

    siteName:
      "The Central Guild",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Central Guild",
      },
    ],

    locale: "en_US",

    type: "website",
  },

  twitter: {
    card: "summary_large_image",

    title:
      "The Central Guild",

    description:
      "Enter as unknown. Leave as legend.",

    images: [
      "/og-image.png",
    ],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview":
        "large",
      "max-snippet": -1,
      "max-video-preview":
        -1,
    },
  },

  category: "community",

  alternates: {
    canonical:
      "https://thecentralguild.quest",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="
          bg-[#050505]
          text-white
          antialiased
        "
      >
        <GuildAuthProvider>
          {children}
        </GuildAuthProvider>
      </body>
    </html>
  );
}