import type { Metadata } from "next";
import "./globals.css";

import {
  GuildAuthProvider,
} from "@/components/guild/GuildAuthLogic";
import {
  defaultDescription,
  coreKeywords,
  siteName,
  siteUrl,
} from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(
    siteUrl
  ),

  title: {
    default:
      "The Central Guild — Build Skills Through Real Projects",
    template: "%s | The Central Guild",
  },

  description: defaultDescription,

  keywords: coreKeywords,

  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },

  openGraph: {
    title: siteName,
    description: defaultDescription,

    url: siteUrl,

    siteName,

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

    title: siteName,

    description: defaultDescription,

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
      siteUrl,
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
