import AmbientGlow from "@/components/guild/AmbientGlow";
import BackgroundEmblem from "@/components/guild/BackgroundEmblem";
import GuildNavbar from "@/components/guild/GuildNavbar";

import GuildAuthUI from "@/components/guild/GuildAuthUI";

export default function LoginPage() {
  return (
    <main
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-[#120d08]
        text-white
      "
    >

      {/* Fixed Atmosphere */}
      <div className="fixed inset-0">

        <AmbientGlow />
        <BackgroundEmblem />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Warm Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,180,80,0.08),transparent_45%)]" />

        {/* Side Auras */}
        <div className="absolute left-[-10%] top-[20%] h-[500px] w-[500px] rounded-full bg-yellow-700/10 blur-[180px]" />

        <div className="absolute right-[-10%] bottom-[10%] h-[500px] w-[500px] rounded-full bg-yellow-500/5 blur-[180px]" />

      </div>

      {/* Locked Navbar */}
      <div
        className="
          fixed
          left-0
          top-0
          z-50
          w-full
          border-b
          border-yellow-900/10
          bg-black/30
          backdrop-blur-xl
        "
      >

        <GuildNavbar />

      </div>

      {/* Auth UI */}
      <div className="relative z-10 pt-28">

        <GuildAuthUI />

      </div>

      {/* Bottom Fade */}
      <div className="pointer-events-none fixed bottom-0 z-40 h-32 w-full bg-gradient-to-t from-black via-black/60 to-transparent" />

    </main>
  );
}