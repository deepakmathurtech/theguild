"use client";

import Image from "next/image";
import Link from "next/link";
import { trackGuildEvent } from "@/utils/analytics";

export default function Hero() {
  return (
    <section
      className="
        relative
        z-10
        flex
        min-h-[100dvh]
        flex-col
        items-center
        justify-center
        px-4
        pt-24
        pb-16
        text-center
        sm:px-6
        md:min-h-[85vh]
        md:px-8
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          flex
          items-center
          justify-center
        "
      >
        <Image
          src="/guild-logo.png"
          alt="Guild Background Emblem"
          width={700}
          height={700}
          priority
          className="
            w-[120vw]
            max-w-[700px]
            scale-110
            select-none
            opacity-[0.08]
            blur-[1px]
            drop-shadow-[0_0_80px_rgba(212,164,75,0.15)]
          "
        />
      </div>

      <p
        className="
          relative
          mb-5
          text-[10px]
          tracking-[0.45em]
          text-yellow-700
          sm:text-xs
          md:tracking-[0.6em]
        "
      >
        ADVENTURER ASSOCIATION
      </p>

      <h1
        className="
          relative
          text-4xl
          font-black
          tracking-[0.18em]
          text-yellow-400
          sm:text-5xl
          md:text-7xl
          md:tracking-[0.35em]
          lg:text-8xl
        "
      >
        THE GUILD
      </h1>

      <p
        className="
          relative
          mt-6
          max-w-2xl
          px-2
          text-lg
          font-black
          leading-loose
          tracking-[0.12em]
          text-zinc-200
          sm:text-xl
          md:mt-8
          md:text-3xl
          md:tracking-[0.18em]
        "
      >
        BUILD SKILLS.
        <br />
        COMPLETE QUESTS.
        <br />
        GROW TOGETHER.
      </p>

      <p
        className="
          relative
          mt-6
          max-w-3xl
          px-2
          text-sm
          leading-7
          text-zinc-400
          sm:text-base
        "
      >
        Turn learning, contribution, and personal growth into an interactive journey through verified quests, ranks, Guild ID profiles, and community collaboration.
      </p>

      <div
        className="
          relative
          mt-12
          grid
          w-full
          max-w-3xl
          gap-3
          sm:grid-cols-2
        "
      >
        <Link
          href="/login"
          onClick={() =>
            trackGuildEvent(
              "landing_to_register"
            )
          }
          className="
            border
            border-yellow-700
            bg-yellow-500/10
            px-6
            py-4
            text-[10px]
            tracking-[0.3em]
            text-yellow-300
            transition-all
            duration-300
            hover:scale-[1.02]
            hover:bg-yellow-500/20
            hover:text-yellow-200
          "
        >
          BECOME AN ADVENTURER
        </Link>

        <Link
          href="/quests"
          onClick={() =>
            trackGuildEvent(
              "verification_to_first_quest"
            )
          }
          className="
            border
            border-zinc-800
            bg-zinc-900/30
            px-6
            py-4
            text-[10px]
            tracking-[0.3em]
            text-zinc-300
            transition-all
            duration-300
            hover:scale-[1.02]
            hover:border-yellow-600
            hover:text-yellow-300
          "
        >
          EXPLORE QUESTS
        </Link>
      </div>

      <div
        className="
          relative
          mt-12
          grid
          w-full
          max-w-3xl
          gap-3
          text-left
          sm:grid-cols-3
        "
      >
        {[
          ["01", "Join as an Adventurer"],
          ["02", "Complete verified Quests"],
          ["03", "Grow your Guild ID"],
        ].map(([step, label]) => (
          <div
            key={step}
            className="
              border
              border-yellow-900/20
              bg-black/30
              p-4
              backdrop-blur-md
            "
          >
            <p className="text-[10px] tracking-[0.3em] text-yellow-700">
              {step}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              {label}
            </p>
          </div>
        ))}
      </div>

      <section
        className="
          relative
          mt-12
          w-full
          max-w-4xl
          border-y
          border-yellow-900/20
          py-8
          text-left
        "
        aria-labelledby="what-is-guild"
      >
        <p className="text-[10px] tracking-[0.45em] text-yellow-700">
          WHAT IS THE CENTRAL GUILD?
        </p>
        <h2
          id="what-is-guild"
          className="font-cinzel mt-4 text-2xl text-yellow-400 sm:text-3xl"
        >
          A journey from consuming to creating, contributing, and leading.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">
          Instead of focusing only on resumes, marks, or certificates, Guild helps Adventurers build real experience through community-created Quests. Verified work becomes part of a public profile, creating a living record of skills, experience, and achievements over time.
        </p>
      </section>

      <div
        className="
          relative
          mt-8
          grid
          w-full
          max-w-4xl
          gap-3
          text-left
          sm:grid-cols-5
        "
      >
        {[
          ["Adventurers", "Members building skills"],
          ["Quests", "Verified tasks and projects"],
          ["Ranks", "Progress through contribution"],
          ["Guild ID", "Public participation record"],
          ["Community", "Connect and collaborate"],
        ].map(([title, body]) => (
          <article
            key={title}
            className="border border-yellow-900/20 bg-black/25 p-4 backdrop-blur-md"
          >
            <h3 className="text-sm font-black text-yellow-300">
              {title}
            </h3>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {body}
            </p>
          </article>
        ))}
      </div>

      <div
        className="
          relative
          mt-10
          grid
          w-full
          max-w-4xl
          gap-3
          text-left
          sm:grid-cols-4
        "
      >
        {[
          ["Active Adventurers", "128"],
          ["Quests Completed", "342"],
          ["Departments", "8"],
          ["Cities", "5"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border border-yellow-900/20 bg-black/25 p-4 backdrop-blur-md"
          >
            <p className="text-2xl font-black text-yellow-300">
              {value}
            </p>
            <p className="mt-2 text-[10px] tracking-[0.24em] text-zinc-500">
              {label.toUpperCase()}
            </p>
          </div>
        ))}
      </div>

      <p
        className="
          relative
          mt-16
          text-[9px]
          tracking-[0.45em]
          text-yellow-700
          sm:text-[10px]
          md:tracking-[0.7em]
        "
      >
        STRIVE | SURPASS | SOVEREIGN
      </p>
    </section>
  );
}
