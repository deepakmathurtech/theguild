"use client";

import Image from "next/image";

type GuildIdentitySectionProps = {
  name?: string;
  rank?: string;
};

export default function GuildIdentitySection({
  name = "Guild Adventurer",
  rank = "F-RANK",
}: GuildIdentitySectionProps) {
  return (
    <div className="relative flex items-center justify-center">

      {/* Massive Aura */}
      <div className="absolute h-[680px] w-[680px] rounded-full bg-yellow-700/10 blur-[240px]" />

      {/* Ground Reflection */}
      <div className="absolute top-[72%] h-44 w-[560px] rounded-full bg-yellow-500/15 blur-[130px]" />

      {/* Floating Shadow */}
      <div className="absolute top-[64%] h-28 w-[500px] rounded-full bg-black blur-3xl" />

      {/* Main Card */}
      <div
        className="
          group
          relative
          mt-25
          aspect-[1.58/1]
          w-full
          max-w-[580px]
          overflow-hidden

          border
          border-yellow-700/20

          bg-[#020202]

          shadow-[0_120px_260px_rgba(0,0,0,1)]

          transform-gpu
          transition-all
          duration-700

          [transform-style:preserve-3d]
          [backface-visibility:visible]

          will-change-transform
        "
        style={{
          clipPath:
            "polygon(0% 8%,8% 0%,92% 0%,100% 8%,100% 92%,92% 100%,8% 100%,0% 92%)",

          animation:
            "guildSpin 7s linear infinite",

          transformOrigin:
            "50% 50%",
        }}
        
      >

        {/* Core Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,180,60,0.08), transparent 65%)",
          }}
        />

        {/* Deep Metallic Base */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#020202_0%,#070707_35%,#030303_100%)]" />

        {/* Warm Gold Reflection */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(212,164,75,0.16),transparent_48%)]" />

        {/* Upper Reflection */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.07),transparent_28%)]" />

        {/* Anime Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,164,75,0.05),transparent_60%)]" />

        {/* Metallic Sweep */}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(212,164,75,0.05)_50%,transparent_80%)]" />

        {/* Carbon Texture */}
        <div className="absolute inset-0 opacity-[0.035] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        {/* Metal Border */}
        <div className="absolute inset-[1px] rounded-[16px] border border-yellow-500/10" />

        {/* Inner Gold Reflection */}
        <div className="absolute inset-[1px] rounded-[16px] shadow-[inset_0_0_120px_rgba(212,164,75,0.06)]" />

        {/* Forged Edge Shine */}
        <div className="absolute inset-0 rounded-[16px] shadow-[inset_0_1px_0_rgba(255,215,120,0.15)]" />

        {/* Top Shine */}
        <div className="absolute top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-yellow-400/90 to-transparent" />

        {/* Side Reflection */}
        <div className="absolute left-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-yellow-500/30 to-transparent" />

        {/* Noise Overlay */}
        <div className="absolute inset-0 opacity-[0.02] mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')]" />

        {/* Background Emblem */}
        <div className="absolute inset-0 flex items-center justify-center">

          <Image
            src="/guild-logo.png"
            alt=""
            width={420}
            height={420}
            className="
              absolute
              scale-125
              opacity-[0.03]
              blur-[1px]
            "
          />

        </div>

        {/* Magical Rings */}
        <div className="absolute inset-0 flex items-center justify-center">

          <div className="absolute h-[420px] w-[420px] rounded-full border border-yellow-500/[0.05]" />

          <div className="absolute h-[320px] w-[320px] rounded-full border border-yellow-500/[0.08]" />

          <div className="absolute h-[220px] w-[220px] rounded-full border border-yellow-500/[0.12]" />

        </div>

        {/* Branding */}
        <div className="absolute left-9 top-8 z-20">

          <p
            className="
              font-cinzel
              text-[11px]
              font-semibold
              tracking-[0.6em]
              text-yellow-500/80
              drop-shadow-[0_0_10px_rgba(212,164,75,0.35)]
            "
          >
            THE GUILD
          </p>

          <div className="mt-2 h-[1px] w-32 bg-gradient-to-r from-yellow-500/60 to-transparent" />

        </div>

        <div className="absolute bottom-9 left-9 z-20 right-9">

          <p
            className="
              font-cinzel
              text-[10px]
              tracking-[0.45em]
              text-yellow-500/70
            "
          >
            REGISTERED ADVENTURER
          </p>

          <div className="mt-3 flex items-end justify-between gap-4">

            <p
              className="
                font-cormorant
                truncate
                text-3xl
                italic
                text-zinc-100
              "
            >
              {name}
            </p>

            <p
              className="
                border
                border-yellow-700/30
                bg-yellow-500/10
                px-3
                py-2
                text-[10px]
                tracking-[0.25em]
                text-yellow-300
              "
            >
              {rank}
            </p>

          </div>

        </div>

        {/* Center Core */}
        <div className="absolute inset-0 flex items-center justify-center">

          <div className="absolute h-[280px] w-[280px] rounded-full bg-yellow-500/10 blur-[120px]" />

          <div className="absolute h-[360px] w-[360px] rounded-full bg-white/[0.02] blur-[150px]" />

          <div className="absolute h-[200px] w-[200px] rounded-full bg-yellow-400/[0.06] blur-[80px]" />

          <Image
            src="/stamp.png"
            alt="Guild Stamp"
            width={160}
            height={160}
            className="
              relative
              z-10
              object-contain
              opacity-95
              drop-shadow-[0_0_45px_rgba(212,164,75,0.32)]
            "
          />

        </div>

        {/* Corner Frames */}
        <div className="absolute left-5 top-5 h-16 w-16 rounded-tl-xl border-l border-t border-yellow-700/20" />

        <div className="absolute right-5 top-5 h-16 w-16 rounded-tr-xl border-r border-t border-yellow-700/20" />

        <div className="absolute bottom-5 left-5 h-16 w-16 rounded-bl-xl border-b border-l border-yellow-700/20" />

        <div className="absolute bottom-5 right-5 h-16 w-16 rounded-br-xl border-b border-r border-yellow-700/20" />

        {/* Holographic Sweep */}
        <div
          className="
            absolute
            -left-52
            top-0
            h-full
            w-40
            rotate-12
            bg-white/[0.04]
            blur-2xl
            transition-all
            duration-[1600ms]
            group-hover:left-[130%]
          "
        />

        {/* Bottom Reflection */}
        <div className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-yellow-500/[0.03] to-transparent" />

      </div>

    </div>
  );
}
