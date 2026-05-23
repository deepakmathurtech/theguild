"use client";

import AmbientGlow from "@/components/guild/AmbientGlow";

import BackgroundEmblem from "@/components/guild/BackgroundEmblem";

import GuildNavbar from "@/components/guild/GuildNavbar";
import ProtectedRoute from "@/components/guild/ProtectedRoute";

import YourQuest from "@/components/guild/YourQuest";

import QuestReport from "@/components/guild/QuestReport";

export default function AssignedPage() {

  return (
    <ProtectedRoute access="adventurer">
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

      {/* CONTENT */}
      <section
        className="
          relative
          z-10
          mx-auto
          max-w-7xl
          px-6
          pb-20
          pt-36
        "
      >

        {/* HEADER */}
        <div className="mb-14">

          <p
            className="
              text-[10px]
              tracking-[0.45em]
              text-yellow-700
            "
          >
            ACTIVE OPERATIONS
          </p>

          <h1
            className="
              font-cinzel
              mt-5
              text-5xl
              text-yellow-400
            "
          >
            Assigned Missions
          </h1>

          <p
            className="
              font-cormorant
              mt-6
              max-w-3xl
              text-2xl
              italic
              leading-relaxed
              text-zinc-500
            "
          >
            Missions currently assigned by the
            guild council to your adventurer
            dossier.
          </p>

        </div>

        {/* QUEST */}
        <YourQuest />

        {/* REPORT */}
        <div className="mt-12">

          <QuestReport />

        </div>

      </section>

      </main>
    </ProtectedRoute>
  );
}
