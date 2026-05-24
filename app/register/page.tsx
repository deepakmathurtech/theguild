"use client";

import Link from "next/link";

import AmbientGlow from "@/components/guild/AmbientGlow";
import BackgroundEmblem from "@/components/guild/BackgroundEmblem";
import GuildNavbar from "@/components/guild/GuildNavbar";
import ProtectedRoute from "@/components/guild/ProtectedRoute";

import RegisterForm from "@/components/guild/RegisterForm"

import RegisterNow from "@/components/guild/RegisterNow";

import { useGuildAuth } from "@/components/guild/GuildAuthLogic";

export default function RegisterPage() {

  const {
    user,
    guildProfile,
    isAdventurer,
    loading,
  } = useGuildAuth();

  const hasCompletedProfile =
    Boolean(
      guildProfile?.adventurerId
    );

  // Loading
  if (loading) {
    return null;
  }

  // Not Logged In
  if (!user) {
    return (
      <ProtectedRoute access="signed-in">
        <RegisterNow />
      </ProtectedRoute>
    );
  }

  // Already Registered
  if (
    isAdventurer &&
    hasCompletedProfile
  ) {
    return (
      <main
        className="
          relative
          flex
          min-h-screen
          items-center
          justify-center
          overflow-x-hidden
          bg-[#120d08]
          text-white
        "
      >

        {/* Background */}
        <AmbientGlow />

        <BackgroundEmblem />

        <div className="absolute inset-0 bg-black/60" />

        {/* Navbar */}
        <div className="relative z-50 w-full">

          <GuildNavbar />

        </div>

        {/* Content */}
        <section
          className="
            absolute
            inset-0
            z-10
            flex
            items-center
            justify-center
            px-4
            py-24
            sm:px-6
          "
        >

          <div
            className="
              relative
              w-full
              max-w-2xl
              overflow-hidden
              rounded-[34px]
              border
              border-yellow-900/20
              bg-black/40
              p-6
              backdrop-blur-xl
              sm:p-14
            "
          >

            {/* Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,164,75,0.08),transparent_40%)]" />

            <div className="relative z-10">

              <p className="text-[10px] tracking-[0.22em] text-yellow-700 sm:tracking-[0.45em]">
                GUILD REGISTRY
              </p>

              <h1
                className="
                  font-cinzel
                  mt-5
                  text-3xl
                  text-yellow-400
                  sm:text-5xl
                "
              >
                Already Registered
              </h1>

              <p
                className="
                  font-cormorant
                  mt-8
                  text-xl
                  italic
                  leading-relaxed
                  text-zinc-400
                  sm:text-3xl
                "
              >
                Your adventurer registration already
                exists within the guild archives.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:gap-5">

                <Link
                  href="/guild-card"
                  className="
                    border-[3px]
                    border-yellow-700
                    px-5
                    py-3
                    text-[10px]
                    font-black
                    tracking-[0.18em]
                    text-yellow-400
                    transition
                    hover:bg-yellow-500
                    hover:text-black
                    text-center
                    sm:px-8
                    sm:tracking-[0.35em]
                  "
                >
                  VIEW GUILD CARD
                </Link>

                <Link
                  href="/quests"
                  className="
                    border
                    border-white/10
                    px-5
                    py-3
                    text-[10px]
                    tracking-[0.18em]
                    text-zinc-400
                    transition
                    hover:border-white/20
                    hover:text-white
                    text-center
                    sm:px-8
                    sm:tracking-[0.35em]
                  "
                >
                  VIEW QUESTS
                </Link>

              </div>

            </div>

          </div>

        </section>

      </main>
    );
  }

  // Registration Form
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

      {/* Background */}
      <AmbientGlow />

      <BackgroundEmblem />

      <div className="absolute inset-0 bg-black/40" />

      {/* Navbar */}
      <div className="relative z-50">

        <GuildNavbar />

      </div>

      {/* Form */}
      <div className="relative z-10">

        <RegisterForm />

      </div>

      </main>
    </ProtectedRoute>
  );
}
