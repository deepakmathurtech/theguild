"use client";

import AmbientGlow from "@/components/guild/AmbientGlow";
import BackgroundEmblem from "@/components/guild/BackgroundEmblem";
import GuildNavbar from "@/components/guild/GuildNavbar";
import ProtectedRoute from "@/components/guild/ProtectedRoute";

import GuildIdentitySection from "@/components/guild/GuildIdentitySection";

import RegisterNow from "@/components/guild/RegisterNow";

import { useGuildAuth } from "@/components/guild/GuildAuthLogic";

export default function GuildCardPage() {

  const {
    user,
    guildProfile,
    isAdventurer,
    loading,
  } = useGuildAuth();

  // LOADING
  if (loading) {
    return (
      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#070707]
          text-yellow-500
        "
      >

        <p className="font-cinzel text-xl tracking-[0.3em]">
          LOADING GUILD ARCHIVES...
        </p>

      </main>
    );
  }

  // NOT LOGGED IN
  if (!user) {
    return (
      <ProtectedRoute access="signed-in">
        <RegisterNow />
      </ProtectedRoute>
    );
  }

  // NOT REGISTERED
  if (!isAdventurer || !guildProfile) {
    return <RegisterNow />;
  }

  // PENDING APPROVAL
  if (guildProfile.approved === false) {
    return (
      <main
        className="
          relative
          flex
          min-h-screen
          items-center
          justify-center
          overflow-hidden
          bg-[#070707]
          text-white
        "
      >

        <AmbientGlow />

        <BackgroundEmblem />

        <div className="absolute inset-0 bg-black/70" />

        <section
          className="
            relative
            z-10
            w-full
            max-w-2xl
            overflow-hidden
            rounded-[34px]
            border
            border-yellow-900/20
            bg-black/40
            p-14
            backdrop-blur-xl
          "
        >

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,164,75,0.08),transparent_40%)]" />

          <div className="relative z-10">

            <p className="text-[10px] tracking-[0.45em] text-yellow-700">
              GUILD REGISTRY
            </p>

            <h1
              className="
                font-cinzel
                mt-5
                text-5xl
                text-yellow-400
              "
            >
              Registration Pending
            </h1>

            <p
              className="
                font-cormorant
                mt-8
                text-3xl
                italic
                leading-relaxed
                text-zinc-400
              "
            >
              Your adventurer application is currently
              awaiting guild approval.
            </p>

          </div>

        </section>

      </main>
    );
  }

  // ACCESS GRANTED
  return (
    <ProtectedRoute access="signed-in">
      <main
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-[#070707]
        text-white
      "
    >

      {/* ATMOSPHERE */}
      <div className="fixed inset-0">

        <AmbientGlow />

        <BackgroundEmblem />

        <div className="absolute inset-0 bg-black/70" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,70,20,0.08),transparent_60%)]" />

        <div className="absolute left-[-10%] top-[20%] h-[500px] w-[500px] rounded-full bg-yellow-700/10 blur-[180px]" />

        <div className="absolute right-[-10%] bottom-[10%] h-[500px] w-[500px] rounded-full bg-yellow-500/5 blur-[180px]" />

      </div>

      {/* NAVBAR */}
      <div className="fixed left-0 top-0 z-50 w-full">

        <GuildNavbar />

      </div>

      {/* LOCKED CARD */}
      <div
        className="
          fixed
          left-10
          top-[120px]
          z-30
          hidden
          w-[460px]
          xl:flex
          justify-center
        "
      >

        {/* Glow */}
        <div className="absolute h-[520px] w-[520px] rounded-full bg-yellow-700/10 blur-[180px]" />

        <div className="relative w-full scale-[0.92]">

          <GuildIdentitySection
            name={guildProfile.name}
            rank={guildProfile.guildRank}
          />

        </div>

      </div>

      {/* MAIN */}
      <section
        className="
          relative
          z-10
          ml-[520px]
          px-10
          pt-32
          pb-20
        "
      >

        {/* RIGHT */}
        <div
          className="
            mx-auto
            max-w-[950px]
            space-y-8
          "
        >

          {/* DOSSIER */}
          <GlassPanel>

            <div>

              <p className="text-[10px] tracking-[0.45em] text-yellow-700">
                GUILD DOSSIER
              </p>

              <h1 className="font-cinzel mt-5 text-5xl text-yellow-400">
                Adventurer Record
              </h1>

              <p className="font-cormorant mt-6 max-w-3xl text-2xl italic leading-relaxed text-zinc-500">
                Official guild archive preserving
                the records, achievements, and
                reputation of a registered
                adventurer.
              </p>

            </div>

            {/* GRID */}
            <div className="mt-16 grid grid-cols-2 gap-8">

              <InfoCard
                label="ADVENTURER ID"
                value={
                  guildProfile.adventurerId ||
                  "Pending generation"
                }
              />

              <InfoCard
                label="ADVENTURER"
                value={guildProfile.name}
              />

              <InfoCard
                label="RANK"
                value={guildProfile.guildRank}
              />

              <InfoCard
                label="EMAIL"
                value={guildProfile.email}
              />

              <InfoCard
                label="REPUTATION"
                value={String(
                  guildProfile.reputation || 0
                )}
              />

              <InfoCard
                label="QUESTS COMPLETED"
                value={String(
                  guildProfile.questsCompleted || 0
                )}
              />

              <InfoCard
                label="SPECIALIZATION"
                value={
                  guildProfile.specialization ||
                  "Unknown"
                }
              />

              <InfoCard
                label="STATUS"
                value={
                  guildProfile.approved
                    ? "ACTIVE"
                    : "PENDING"
                }
              />

              <InfoCard
                label="CONTACT"
                value={
                  guildProfile.contact ||
                  "Unavailable"
                }
              />

            </div>

          </GlassPanel>

          {/* EXPERIENCE */}
          <GlassPanel>

            <p className="text-[10px] tracking-[0.45em] text-yellow-700">
              PUBLIC VERIFICATION
            </p>

            <h2 className="font-cinzel mt-5 text-4xl text-yellow-400">
              Shareable Profile
            </h2>

            <p className="font-cormorant mt-6 text-2xl italic leading-relaxed text-zinc-400">
              Public identity page:
              {" "}
              {guildProfile.adventurerId
                ? `/${guildProfile.adventurerId}`
                : "not available yet"}
            </p>

          </GlassPanel>

          <GlassPanel>

            <p className="text-[10px] tracking-[0.45em] text-yellow-700">
              EXPERIENCE
            </p>

            <h2 className="font-cinzel mt-5 text-4xl text-yellow-400">
              Adventurer Background
            </h2>

            <p className="font-cormorant mt-6 text-2xl italic leading-relaxed text-zinc-400">
              {guildProfile.experience ||
                "No experience record available."}
            </p>

          </GlassPanel>

          {/* STATUS */}
          <GlassPanel>

            <p className="text-[10px] tracking-[0.45em] text-yellow-700">
              GUILD STATUS
            </p>

            <h2 className="font-cinzel mt-5 text-4xl text-yellow-400">
              Archive Status Active
            </h2>

            <p className="font-cormorant mt-6 text-2xl italic leading-relaxed text-zinc-400">
              Adventurer profile verified and connected
              to the guild archive system. Reputation,
              rank progression, and quest history are
              now actively tracked.
            </p>

          </GlassPanel>

        </div>

      </section>

      {/* BOTTOM FADE */}
      <div className="pointer-events-none fixed bottom-0 z-40 h-32 w-full bg-gradient-to-t from-black via-black/50 to-transparent" />

      </main>
    </ProtectedRoute>
  );
}

/* INFO CARD */
function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-[26px]
        border
        border-yellow-900/10
        bg-black/20
        p-7
      "
    >

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.03),transparent_45%)]" />

      <div className="relative z-10">

        <p className="text-[10px] tracking-[0.35em] text-yellow-700">
          {label}
        </p>

        <p
          className="
            font-cormorant
            mt-4
            break-words
            text-3xl
            italic
            leading-tight
            text-zinc-200
          "
        >
          {value}
        </p>

      </div>

    </div>
  );
}

/* GLASS PANEL */
function GlassPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-[34px]
        border
        border-yellow-900/20
        bg-black/30
        p-10
        backdrop-blur-xl
      "
    >

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.06),transparent_35%)]" />

      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      <div className="relative z-10">

        {children}

      </div>

    </div>
  );
}
