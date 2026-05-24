"use client";

import { useState } from "react";

import {
  canAcceptQuest,
  acceptQuest,
} from "./questEligibility";

import { useGuildAuth }
from "./GuildAuthLogic";
import {
  readableStatus,
  statusClass,
} from "@/lib/status";
import { trackGuildEvent } from "@/utils/analytics";

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

  category?: string;

  tags?: string[];

  location?: string;

  duration?: string;

  rewardType?: string;

  createdBy?: string;

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
  category,
  tags,
  location,
  duration,
  rewardType,
  createdBy,

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
    String(status || "open")
      .toLowerCase();

  const finalExpired =
    expired || false;

  const displayReward =
    rewardAmount === 0 ||
    reward === "0"
      ? "Volunteer / Recognition / XP"
      : reward;

  const metadataItems = [
    location || "Remote",
    category || finalQuestType,
    duration || "Flexible Duration",
    rewardType || "Recognition",
  ];

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

      trackGuildEvent(
        "verification_to_first_quest",
        {
          questId: id,
        }
      );

      alert(
        "Quest application submitted. Guild staff will review and accept selected applicants."
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
        border-[3px]
        border-[#c9ae7b]
        bg-[#e8d8b4]
        p-4
        text-black
        shadow-[0_25px_70px_rgba(0,0,0,0.55)]
        transition-all
        duration-500
        sm:border-[4px]
        sm:p-6
        md:p-8
        sm:hover:z-20
        sm:hover:-translate-y-3
        sm:hover:rotate-0
        sm:hover:scale-[1.03]
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
          h-14
          w-14
          border-b
          border-l
          border-black/10
          bg-gradient-to-bl
          from-[#f5e7c8]
          to-[#d8c09a]
          sm:h-20
          sm:w-20
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
      <div className="absolute left-4 top-8 h-28 w-28 rounded-full bg-[#8b5e34]/[0.05] blur-3xl sm:left-8 sm:top-10 sm:h-40 sm:w-40" />

      <div className="absolute bottom-10 right-4 h-32 w-32 rounded-full bg-black/[0.04] blur-3xl sm:right-12 sm:h-44 sm:w-44" />

      {/* PINS */}
      <div className="absolute left-4 top-4 h-3 w-3 rounded-full bg-[#5b3c17] shadow-inner" />

      <div className="absolute right-4 top-4 h-3 w-3 rounded-full bg-[#5b3c17] shadow-inner" />

      {/* DIFFICULTY STAMP */}
      <div
        className={`
          relative
          z-10
          mt-4
          inline-flex
          rotate-[14deg]
          border-[3px]
          px-3
          py-1
          text-xs
          font-black
          tracking-[0.22em]
          opacity-80
          backdrop-blur-sm
          transition
          duration-500
          group-hover:scale-105
          sm:absolute
          sm:right-6
          sm:top-10
          sm:mt-0
          sm:px-5
          sm:text-sm
          sm:tracking-[0.35em]
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
          text-[96px]
          font-black
          text-black/[0.04]
          select-none
          transition
          duration-500
          group-hover:scale-110
          group-hover:rotate-6
          sm:text-[140px]
        "
      >
        {seal}
      </div>

      {/* TOP */}
      <div className="relative z-10 mt-4 flex items-center justify-between gap-3 sm:mt-0">

        <p
          className="
            min-w-0
            break-words
            text-[10px]
            tracking-[0.22em]
            text-[#6b4c34]
            sm:text-[11px]
            sm:tracking-[0.45em]
          "
        >
          {finalQuestType}
        </p>

        <div className="h-[2px] w-10 shrink-0 bg-black/10 sm:w-16" />

      </div>

      {/* TITLE */}
      <h2
        className="
          relative
          z-10
          mt-5
          break-words
          text-2xl
          font-black
          leading-tight
          text-[#24160d]
          sm:text-3xl
          lg:text-4xl
        "
      >
        {title}
      </h2>

      {/* STATUS TAGS */}
      <div className="relative z-10 mt-4 flex flex-wrap gap-2 sm:mt-5">

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
              tracking-[0.16em]
              text-emerald-800
              sm:tracking-[0.25em]
            "
          >
            VERIFIED
          </span>
        )}

        {finalStatus && (
          <span
            className={`
              border
              px-2
              py-1
              text-[10px]
              font-black
              tracking-[0.16em]
              sm:tracking-[0.25em]
              ${statusClass(finalStatus)}
            `}
          >
            {readableStatus(finalStatus).toUpperCase()}
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
              tracking-[0.16em]
              text-red-800
              sm:tracking-[0.25em]
            "
          >
            EXPIRED
          </span>
        )}

      </div>

      {/* DIVIDER */}
      <div className="relative z-10 mt-5 flex items-center gap-3 sm:mt-6">

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
          mt-5
          break-words
          text-sm
          leading-7
          text-[#3d2b1f]
          sm:mt-7
          sm:text-base
          sm:leading-[1.9]
        "
      >
        {description}
      </p>

      {/* QUEST TYPES */}
      {questTypes &&
        questTypes.length > 0 && (

        <div className="relative z-10 mt-6 flex flex-wrap gap-2 sm:mt-8">

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
                  tracking-[0.12em]
                  text-[#5f4632]
                  sm:tracking-[0.2em]
                "
              >
                {questType}
              </div>
            )
          )}

        </div>
      )}

      <div className="relative z-10 mt-5 grid gap-2 sm:mt-6 sm:grid-cols-2">
        {metadataItems.map((item) => (
          <div
            key={item}
            className="
              border
              border-black/10
              bg-black/[0.03]
              px-3
              py-2
              text-[10px]
              tracking-[0.1em]
              text-[#5f4632]
              sm:tracking-[0.18em]
            "
          >
            {item}
          </div>
        ))}
      </div>

      {tags && tags.length > 0 && (
        <div className="relative z-10 mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="border border-black/10 px-2 py-1 text-[9px] tracking-[0.1em] text-[#6b4c34] sm:tracking-[0.18em]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div
        className="
          relative
          z-10
          mt-8
          flex
          flex-col
          gap-5
          sm:mt-12
          sm:flex-row
          sm:items-end
          sm:justify-between
        "
      >

        {/* REWARD */}
        <div className="min-w-0">

          <p
            className="
              text-[10px]
              tracking-[0.2em]
              text-[#6b4c34]
              sm:tracking-[0.35em]
            "
          >
            REWARD
          </p>

          <p
            className="
              mt-2
              max-w-full
              break-words
              text-2xl
              font-black
              leading-tight
              text-[#8c5d17]
              drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]
              sm:text-3xl
              lg:text-4xl
            "
          >
            {displayReward}
          </p>

          {rewardAmount ? (
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
          ) : null}

          {createdBy && (
            <p className="mt-2 break-words text-[10px] tracking-[0.1em] text-black/45 sm:tracking-[0.15em]">
              BY {createdBy}
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
            finalStatus !== "open"
          }
          className="
            group/button
            relative
            overflow-hidden
            border-[3px]
            border-[#24160d]
            bg-black/5
            px-5
            py-3
            text-[11px]
            font-black
            tracking-[0.22em]
            transition-all
            duration-300
            hover:scale-105
            hover:bg-[#24160d]
            hover:text-[#e8d8b4]
            disabled:cursor-not-allowed
            disabled:opacity-50
            w-full
            sm:w-auto
            sm:px-6
            sm:tracking-[0.35em]
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
              : finalStatus !== "open"
              ? "CLOSED"
              : "APPLY"}

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
            tracking-[0.16em]
            text-black/40
            sm:tracking-[0.35em]
          "
        >
          FORTUNA • HONOR • GLORIA
        </p>

      </div>

    </div>
  );
}
