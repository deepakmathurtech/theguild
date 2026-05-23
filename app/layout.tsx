import type { Metadata } from "next";

import "./globals.css";

import {
  GuildAuthProvider,
} from "@/components/guild/GuildAuthLogic";

export const metadata: Metadata = {
  title: "The Guild",
  description:
    "Enter as unknown. Leave as legend.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
    >

      <body
        className="
          bg-[#050505]
          text-white
          antialiased
        "
      >

        {/* Global Auth Provider */}
        <GuildAuthProvider>

          {children}

        </GuildAuthProvider>

      </body>

    </html>
  );
}
