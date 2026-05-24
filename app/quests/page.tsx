import AmbientGlow from "@/components/guild/AmbientGlow";

import BackgroundEmblem from "@/components/guild/BackgroundEmblem";

import GuildNavbar from "@/components/guild/GuildNavbar";

import QuestSection from "@/components/guild/QuestSection";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Quest",
  description:
    "Explore verified Quests from The Central Guild: real-world projects, tasks, challenges, initiatives, and opportunities where Adventurers build skills through contribution.",
  path: "/quests",
});

export default function QuestsPage() {

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

      {/* BACKGROUND */}
      <div className="fixed inset-0">

        <AmbientGlow />

        <BackgroundEmblem />

        <div className="absolute inset-0 bg-black/70" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,180,80,0.08),transparent_45%)]" />

      </div>

      {/* NAVBAR */}
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

      {/* QUEST SYSTEM */}
      <div className="relative z-10">

        <QuestSection />

      </div>

    </main>
  );
}
