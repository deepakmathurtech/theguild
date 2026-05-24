import type { Metadata } from "next";
import "./globals.css";

import {
  GuildAuthProvider,
} from "@/components/guild/GuildAuthLogic";

export const metadata: Metadata = {
  metadataBase: new URL("https://theguild.vercel.app"), // replace later

  title: {
    default: "The Guild",
    template: "%s | The Guild",
  },

  description:
    "Enter as unknown. Leave as legend. Join quests, build skills, and grow with your city Guild.",

  keywords: [
    "Guild",
    "community",
    "quests",
    "adventurer",
    "skills",
    "student community",
  ],

  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },

  openGraph: {
    title: "The Guild",
    description:
      "Enter as unknown. Leave as legend.",
    url: "https://theguild.vercel.app",
    siteName: "The Guild",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "The Guild",
    description:
      "Enter as unknown. Leave as legend.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
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
