import AmbientGlow from "@/components/guild/AmbientGlow";
import BackgroundEmblem from "@/components/guild/BackgroundEmblem";
import GuildNavbar from "@/components/guild/GuildNavbar";
import ProtectedRoute from "@/components/guild/ProtectedRoute";

import QuestRegister from "@/components/guild/QuestRegister";

export default function QuestRegistrationPage() {
  return (
    <ProtectedRoute access="signed-in">
      <main
        className="
          relative
          min-h-screen
          overflow-x-hidden
          bg-[#120d08]
          text-white
        "
      >

      {/* FIXED ATMOSPHERE */}
      <div className="fixed inset-0">

        <AmbientGlow />

        <BackgroundEmblem />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-black/70" />

        {/* WARM GLOW */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,180,80,0.08),transparent_45%)]" />

        {/* SIDE AURAS */}
        <div className="absolute left-[-10%] top-[20%] h-[500px] w-[500px] rounded-full bg-yellow-700/10 blur-[180px]" />

        <div className="absolute right-[-10%] bottom-[10%] h-[500px] w-[500px] rounded-full bg-yellow-500/5 blur-[180px]" />

      </div>

      {/* LOCKED NAVBAR */}
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

      {/* FORM */}
      <div className="relative z-10 pt-28">

        <QuestRegister />

      </div>

      {/* BOTTOM FADE */}
      <div className="pointer-events-none fixed bottom-0 z-40 h-32 w-full bg-gradient-to-t from-black via-black/60 to-transparent" />

      </main>
    </ProtectedRoute>
  );
}
