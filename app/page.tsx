// app/page.tsx

import GuildNavbar from "@/components/guild/GuildNavbar";
import Hero from "@/components/guild/Hero";

export default function Home() {
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