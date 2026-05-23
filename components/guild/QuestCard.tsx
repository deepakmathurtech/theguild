"use client";

import { useState } from "react";

import {
  canAcceptQuest,
  acceptQuest,
} from "./questEligibility";

import { useGuildAuth }
from "./GuildAuthLogic";

type QuestCardProps = {
  id: string;

  /* NEW DB */
  difficulty?: string;

  questTypeLabel?: string;

  questTypes?: string[];

  status?: string;

  verified?: boolean;

  expired?: boolean;

  rewardAmount?: number;

  /* OLD DB FALLBACK */
  rank?: string;

  type?: string;

  /* COMMON */
  title: string;

  description: string;

  reward: string;

  seal: string;

  rotation?: string;
};

export default function QuestCard({
  id,

  difficulty,

  questTypeLabel,

  questTypes,

  status,

  verified,

  expired,

  rewardAmount,

  /* OLD FALLBACK */
  rank,

  type,

  title,

  description,

  reward,

  seal,

  rotation = "",
}: QuestCardProps) {

  const {
    user,
    guildProfile,
  } = useGuildAuth();

  const [loading, setLoading] =
    useState(false);

  const [accepted, setAccepted] =
    useState(false);

  /* ----------------------------- */
  /* FALLBACK SUPPORT */
  /* ----------------------------- */

  const finalDifficulty =
    difficulty || rank || "E-RANK";

  const finalQuestType =
    questTypeLabel ||
    type ||
    "GENERAL QUEST";

  const finalStatus =
    status || "OPEN";

  const finalExpired =
    expired || false;

  /* ----------------------------- */
  /* STAMP COLORS */
  /* ----------------------------- */

  function getStampColor(
    difficulty: string
  ) {

    switch (difficulty) {

      case "S-RANK":
        return `
          border-red-800
          text-red-800
          bg-red-900/5
          shadow-[0_0_30px_rgba(127,29,29,0.25)]
        `;

      case "A-RANK":
        return `
          border-purple-700
          text-purple-800
          bg-purple-700/5
          shadow-[0_0_30px_rgba(126,34,206,0.25)]
        `;

      case "B-RANK":
        return `
          border-yellow-700
          text-yellow-800
          bg-yellow-700/5
          shadow-[0_0_30px_rgba(161,98,7,0.2)]
        `;

      case "C-RANK":
        return `
          border-green-700
          text-green-800
          bg-green-700/5
          shadow-[0_0_30px_rgba(21,128,61,0.2)]
        `;

      default:
        return `
          border-zinc-700
          text-zinc-800
          bg-zinc-700/5
        `;
    }
  }

  /* ----------------------------- */
  /* ACCEPT QUEST */
  /* ----------------------------- */

  async function handleAcceptQuest() {

    try {

      setLoading(true);

      const validation =
        await canAcceptQuest({
          questId: id,

          user,

          guildProfile,
        });

      if (!validation.allowed) {

        alert(validation.message);

        return;
      }

      await acceptQuest({
        questId: id,

        user,

        guildProfile,
      });

      setAccepted(true);

      alert(
        "Quest application submitted successfully."
      );

    } catch (error) {

      console.log(error);

      alert(
        "Failed to process quest."
      );

    } finally {

      setLoading(false);

    }
  }

  return (
    <div
      className={`
        group
        relative
        ${rotation}
        overflow-hidden
        border-[4px]
        border-[#c9ae7b]
        bg-[#e8d8b4]
        p-8
        text-black
        shadow-[0_25px_70px_rgba(0,0,0,0.55)]
        transition-all
        duration-500
        hover:z-20
        hover:-translate-y-3
        hover:rotate-0
        hover:scale-[1.03]
      `}
    >

      {/* PAPER TEXTURE */}
      <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/old-wall.png')]" />

      {/* BURN OVERLAY */}
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.18)]" />

      {/* PAPER FOLD */}
      <div
        className="
          absolute
          right-0
          top-0
          h-20
          w-20
          border-b
          border-l
          border-black/10
          bg-gradient-to-bl
          from-[#f5e7c8]
          to-[#d8c09a]
        "
      />

      {/* GLOW */}
      <div
        className="
          absolute
          inset-0
          opacity-0
          transition
          duration-500
          group-hover:opacity-100
          bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)]
        "
      />

      {/* INK BLOBS */}
      <div className="absolute left-8 top-10 h-40 w-40 rounded-full bg-[#8b5e34]/[0.05] blur-3xl" />

      <div className="absolute bottom-10 right-12 h-44 w-44 rounded-full bg-black/[0.04] blur-3xl" />

      {/* PINS */}
      <div className="absolute left-4 top-4 h-3 w-3 rounded-full bg-[#5b3c17] shadow-inner" />

      <div className="absolute right-4 top-4 h-3 w-3 rounded-full bg-[#5b3c17] shadow-inner" />

      {/* DIFFICULTY STAMP */}
      <div
        className={`
          absolute
          right-6
          top-10
          rotate-[14deg]
          border-[3px]
          px-5
          py-1
          text-sm
          font-black
          tracking-[0.35em]
          opacity-80
          backdrop-blur-sm
          transition
          duration-500
          group-hover:scale-105
          ${getStampColor(
            finalDifficulty
          )}
        `}
      >
        {finalDifficulty}
      </div>

      {/* HUGE SEAL */}
      <div
        className="
          absolute
          bottom-0
          right-3
          text-[140px]
          font-black
          text-black/[0.04]
          select-none
          transition
          duration-500
          group-hover:scale-110
          group-hover:rotate-6
        "
      >
        {seal}
      </div>

      {/* TOP */}
      <div className="relative z-10 flex items-center justify-between">

        <p
          className="
            text-[11px]
            tracking-[0.45em]
            text-[#6b4c34]
          "
        >
          {finalQuestType}
        </p>

        <div className="h-[2px] w-16 bg-black/10" />

      </div>

      {/* TITLE */}
      <h2
        className="
          relative
          z-10
          mt-5
          text-4xl
          font-black
          leading-tight
          text-[#24160d]
        "
      >
        {title}
      </h2>

      {/* STATUS TAGS */}
      <div className="relative z-10 mt-5 flex flex-wrap gap-2">

        {verified && (
          <span
            className="
              border
              border-emerald-700
              bg-emerald-700/10
              px-2
              py-1
              text-[10px]
              font-black
              tracking-[0.25em]
              text-emerald-800
            "
          >
            VERIFIED
          </span>
        )}

        {finalStatus === "OPEN" && (
          <span
            className="
              border
              border-blue-700
              bg-blue-700/10
              px-2
              py-1
              text-[10px]
              font-black
              tracking-[0.25em]
              text-blue-800
            "
          >
            OPEN
          </span>
        )}

        {finalExpired && (
          <span
            className="
              border
              border-red-700
              bg-red-700/10
              px-2
              py-1
              text-[10px]
              font-black
              tracking-[0.25em]
              text-red-800
            "
          >
            EXPIRED
          </span>
        )}

      </div>

      {/* DIVIDER */}
      <div className="relative z-10 mt-6 flex items-center gap-3">

        <div className="h-[2px] flex-1 bg-black/10" />

        <div className="text-lg text-[#8c5d17]">
          ⚔
        </div>

        <div className="h-[2px] flex-1 bg-black/10" />

      </div>

      {/* DESCRIPTION */}
      <p
        className="
          relative
          z-10
          mt-7
          leading-[1.9]
          text-[#3d2b1f]
        "
      >
        {description}
      </p>

      {/* QUEST TYPES */}
      {questTypes &&
        questTypes.length > 0 && (

        <div className="relative z-10 mt-8 flex flex-wrap gap-2">

          {questTypes.map(
            (questType) => (

              <div
                key={questType}
                className="
                  border
                  border-black/10
                  bg-black/[0.03]
                  px-3
                  py-1
                  text-[10px]
                  tracking-[0.2em]
                  text-[#5f4632]
                "
              >
                {questType}
              </div>
            )
          )}

        </div>
      )}

      {/* FOOTER */}
      <div
        className="
          relative
          z-10
          mt-12
          flex
          items-end
          justify-between
        "
      >

        {/* REWARD */}
        <div>

          <p
            className="
              text-[10px]
              tracking-[0.35em]
              text-[#6b4c34]
            "
          >
            REWARD
          </p>

          <p
            className="
              mt-2
              text-4xl
              font-black
              text-[#8c5d17]
              drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]
            "
          >
            {reward}
          </p>

          {rewardAmount && (
            <p
              className="
                mt-1
                text-xs
                tracking-[0.15em]
                text-black/50
              "
            >
              VALUE: {rewardAmount}
            </p>
          )}

        </div>

        {/* BUTTON */}
        <button
          onClick={handleAcceptQuest}
          disabled={
            loading ||
            accepted ||
            finalExpired ||
            finalStatus !== "OPEN"
          }
          className="
            group/button
            relative
            overflow-hidden
            border-[3px]
            border-[#24160d]
            bg-black/5
            px-6
            py-3
            text-[11px]
            font-black
            tracking-[0.35em]
            transition-all
            duration-300
            hover:scale-105
            hover:bg-[#24160d]
            hover:text-[#e8d8b4]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >

          {/* SHINE */}
          <div
            className="
              absolute
              inset-0
              -translate-x-full
              bg-gradient-to-r
              from-transparent
              via-white/20
              to-transparent
              transition
              duration-700
              group-hover/button:translate-x-full
            "
          />

          <span className="relative z-10">

            {finalExpired
              ? "EXPIRED"
              : accepted
              ? "APPLIED"
              : loading
              ? "PROCESSING..."
              : finalStatus !== "OPEN"
              ? "CLOSED"
              : "ACCEPT QUEST"}

          </span>

        </button>

      </div>

      {/* FOOTER TEXT */}
      <div
        className="
          relative
          z-10
          mt-10
          border-t
          border-black/10
          pt-4
        "
      >

        <p
          className="
            text-center
            text-[10px]
            tracking-[0.35em]
            text-black/40
          "
        >
          FORTUNA • HONOR • GLORIA
        </p>

      </div>

    </div>
  );
}