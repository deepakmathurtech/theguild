"use client";

import { useEffect } from "react";

import { trackGuildEvent } from "@/utils/analytics";

type YourQuestUIProps = {
  loading: boolean;

  quest: any;
};

export default function YourQuestUI({
  loading,
  quest,
}: YourQuestUIProps) {
  const normalizedStatus =
    String(quest?.status || "")
      .toLowerCase();
  const userReportStatus =
    String(
      quest?.userReportStatus || ""
    ).toLowerCase();
  const userCompleted =
    userReportStatus === "verified";
  const userReportSubmitted =
    userReportStatus === "submitted";

  useEffect(() => {
    if (userCompleted) {
      trackGuildEvent(
        "quest_to_completion",
        {
          questId: String(
            quest?.id || quest?.questId || ""
          ),
        }
      );
    }
  }, [
    quest?.id,
    quest?.questId,
    userCompleted,
  ]);

  /* LOADING */
  if (loading) {
    return (
      <section
        className="
          relative
          overflow-hidden
          rounded-[42px]
          border
          border-yellow-900/20
          bg-black/50
          p-5
          backdrop-blur-2xl
          sm:p-10
          lg:p-14
        "
      >

        {/* Aura */}
        <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-yellow-700/10 blur-[120px]" />

        <div className="absolute right-[-10%] bottom-[-10%] h-72 w-72 rounded-full bg-red-900/10 blur-[120px]" />

        {/* Magic Circle */}
        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-[520px]
            w-[520px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            border
            border-yellow-700/10
            opacity-20
          "
        />

        <div className="relative z-10">

          <p
            className="
              text-[10px]
              tracking-[0.24em]
              text-yellow-700
              sm:tracking-[0.55em]
            "
          >
            GUILD ARCHIVES
          </p>

          <h1
            className="
              font-cinzel
              mt-8
              text-3xl
              leading-tight
              text-yellow-400
              sm:text-5xl
              lg:text-6xl
            "
          >
            Syncing Mission
            <br />
            Records...
          </h1>

          {/* Loader */}
          <div className="mt-10 flex gap-4">

            <div className="h-4 w-4 animate-pulse rounded-full bg-yellow-500" />

            <div className="h-4 w-4 animate-pulse rounded-full bg-yellow-500 [animation-delay:200ms]" />

            <div className="h-4 w-4 animate-pulse rounded-full bg-yellow-500 [animation-delay:400ms]" />

          </div>

        </div>

      </section>
    );
  }

  /* NO QUEST */
  if (!quest) {
    return (
      <section
        className="
          relative
          overflow-hidden
          rounded-[42px]
          border
          border-yellow-900/20
          bg-black/50
          p-5
          backdrop-blur-2xl
          sm:p-10
          lg:p-14
        "
      >

        {/* Magic Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,164,75,0.08),transparent_60%)]" />

        {/* Giant Seal */}
        <div
          className="
            absolute
            right-[-30px]
            top-[-10px]
            text-[120px]
            font-black
            text-yellow-500/[0.03]
            select-none
            sm:text-[220px]
            lg:text-[280px]
          "
        >
          ⚔
        </div>

        <div className="relative z-10">

          <p
            className="
              text-[10px]
              tracking-[0.24em]
              text-yellow-700
              sm:tracking-[0.55em]
            "
          >
            ROYAL GUILD OPERATIONS
          </p>

          <h1
            className="
              font-cinzel
              mt-8
              text-4xl
              leading-[0.95]
              text-yellow-400
              sm:text-6xl
              lg:text-7xl
            "
          >
            No Active
            <br />
            Missions
          </h1>

          <p
            className="
              font-cormorant
              mt-10
              max-w-3xl
              text-xl
              italic
              leading-relaxed
              text-zinc-500
              sm:text-3xl
            "
          >
            The guild council currently has no
            classified operations assigned to
            your adventurer dossier.
          </p>

        </div>

      </section>
    );
  }

  /* STATUS STYLE */
  const statusStyles =
    userCompleted
      ? `
        border-green-700/30
        bg-green-500/10
        text-green-300
      `
      : normalizedStatus ===
      "report_submitted"
      ? `
        border-green-700/30
        bg-green-500/10
        text-green-300
      `
      : `
        border-yellow-700/30
        bg-yellow-500/10
        text-yellow-300
      `;

  return (
    <section
      className="
        group
        relative
        overflow-hidden
        rounded-[42px]
        border
        border-yellow-900/20
        bg-black/50
        p-5
        backdrop-blur-2xl
        sm:p-10
        lg:p-14
      "
    >

      {/* Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.10),transparent_35%)]" />

      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      {/* Magic Circle */}
      <div
        className="
          absolute
          left-1/2
          top-1/2
          h-[650px]
          w-[650px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          border
          border-yellow-700/10
          opacity-20
        "
      />

      {/* Giant Rank */}
      <div
        className="
          absolute
          right-[-30px]
          top-[-40px]
          text-[110px]
          font-black
          text-yellow-500/[0.04]
          select-none
          sm:text-[190px]
          lg:text-[240px]
        "
      >
        {quest.difficulty || "E"}
      </div>

      {/* Rank Ribbon */}
      <div
        className="
          absolute
          right-[-85px]
          top-16
          rotate-45
          border-y
          border-yellow-700/20
          bg-yellow-500/10
          px-28
          py-3
          text-[10px]
          tracking-[0.45em]
          text-yellow-300
          backdrop-blur-xl
          hidden
          sm:block
        "
      >
        ELITE OPERATION
      </div>

      {/* Floating Aura */}
      <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-yellow-700/10 blur-[120px]" />

      <div className="absolute right-[-10%] bottom-[-10%] h-72 w-72 rounded-full bg-red-900/10 blur-[120px]" />

      <div className="relative z-10">

        {/* HEADER */}
        <div
          className="
            flex
            flex-col
            gap-10
            lg:flex-row
            lg:items-start
            lg:justify-between
          "
        >

          <div className="max-w-5xl">

            <p
              className="
                text-[10px]
                tracking-[0.22em]
                text-yellow-700
                sm:tracking-[0.55em]
              "
            >
              ⚔ ROYAL GUILD OPERATION
            </p>

            <h1
              className="
                font-cinzel
                mt-8
                break-words
                text-4xl
                leading-[0.92]
                text-yellow-400
                sm:text-6xl
                lg:text-7xl
              "
            >
              {quest.title}
            </h1>

            <p
              className="
                font-cormorant
                mt-10
                text-xl
                italic
                leading-relaxed
                text-zinc-400
                sm:text-3xl
              "
            >
              {quest.description}
            </p>

          </div>

          {/* STATUS */}
          <div
            className={`
              rounded-full
              border
              px-4
              py-3
              text-[10px]
              tracking-[0.16em]
              backdrop-blur-xl
              sm:px-7
              sm:py-4
              sm:tracking-[0.45em]
              ${statusStyles}
            `}
          >
            ● {(userCompleted
              ? "completed"
              : userReportSubmitted
              ? "report submitted"
              : normalizedStatus)
              .replace("_", " ")
              .toUpperCase()}
          </div>

        </div>

        {/* DIVIDER */}
        <div className="mt-14 h-px w-full bg-gradient-to-r from-transparent via-yellow-700/30 to-transparent" />

        {/* STATS */}
        <div
          className="
            mt-14
            grid
            gap-6
            md:grid-cols-2
            xl:grid-cols-4
          "
        >

          <StatCard
            label="REWARD"
            value={
              quest.reward ||
              "UNKNOWN"
            }
          />

          <StatCard
            label="MISSION TYPE"
            value={
              quest.questType ||
              "QUEST"
            }
          />

          <StatCard
            label="DEADLINE"
            value={
              quest.deadline ||
              "UNKNOWN"
            }
          />

          <StatCard
            label="ASSIGNED BY"
            value={
              quest.assignedToName ||
              "Guild Council"
            }
          />

        </div>

        {/* PROGRESS */}
        <div className="mt-12 sm:mt-16">

          <p
            className="
              text-[10px]
              tracking-[0.18em]
              text-yellow-700
              sm:tracking-[0.45em]
            "
          >
            OPERATION STATUS
          </p>

          <div className="mt-8 grid grid-cols-4 items-start gap-2 sm:flex sm:items-center sm:gap-4">

            <ProgressNode
              active
              label="ASSIGNED"
            />

            <ProgressLine />

            <ProgressNode
              active={
                normalizedStatus ===
                  "report_submitted" ||
                normalizedStatus ===
                  "completed"
                || userReportSubmitted
                || userCompleted
              }
              label="REPORT"
            />

            <ProgressLine />

            <ProgressNode
              active={
                normalizedStatus ===
                "completed" ||
                userCompleted
              }
              label="REVIEW"
            />

            <ProgressLine />

            <ProgressNode
              active={
                normalizedStatus ===
                "completed" ||
                userCompleted
              }
              label="COMPLETE"
            />

          </div>

        </div>

        {/* REPORT PANEL */}
        {(userReportSubmitted ||
          userCompleted ||
          normalizedStatus ===
            "report_submitted") && (

          <div
            className="
              relative
              mt-16
              overflow-hidden
              rounded-[30px]
              border
              border-green-700/20
              bg-green-950/10
              p-5
              sm:p-8
            "
          >

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(50,255,120,0.08),transparent_35%)]" />

            <div className="relative z-10">

              <p
                className="
                  text-[10px]
                  tracking-[0.18em]
                  text-green-500
                  sm:tracking-[0.45em]
                "
              >
                ◆ REPORT ARCHIVED ◆
              </p>

              <h3
                className="
                  font-cinzel
                  mt-5
                  text-3xl
                  text-green-400
                  sm:text-4xl
                "
              >
                {userCompleted
                  ? "Report Verified"
                  : "Awaiting Guild Review"}
              </h3>

              <p
                className="
                  font-cormorant
                  mt-6
                  max-w-4xl
                  text-xl
                  italic
                  leading-relaxed
                  text-zinc-400
                  sm:text-2xl
                "
              >
                {userCompleted
                  ? `Your report has been verified and ${quest.userReportReputation || 0} reputation was added to your guild card.`
                  : "Your operational report has been successfully archived and is now pending guild council review."}
              </p>

            </div>

          </div>
        )}

      </div>

    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;

  value: string;
}) {

  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-[28px]
        border
        border-yellow-900/10
        bg-black/20
        p-5
        transition
        duration-300
        hover:border-yellow-700/30
        hover:bg-black/30
        sm:p-7
      "
    >

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.05),transparent_45%)] opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="relative z-10">

        <p
          className="
            text-[10px]
            tracking-[0.18em]
            text-yellow-700
            sm:tracking-[0.35em]
          "
        >
          {label}
        </p>

        <p
          className="
            font-cormorant
            mt-4
            break-words
            text-2xl
            italic
            leading-tight
            text-zinc-200
            sm:text-3xl
          "
        >
          {value}
        </p>

      </div>

    </div>
  );
}

function ProgressNode({
  active,
  label,
}: {
  active?: boolean;

  label: string;
}) {

  return (
    <div className="flex flex-col items-center">

      <div
        className={`
          h-4
          w-4
          rounded-full
          border

          ${
            active
              ? `
                border-yellow-500
                bg-yellow-500
                shadow-[0_0_20px_rgba(255,210,80,0.7)]
              `
              : `
                border-zinc-700
                bg-zinc-900
              `
          }
        `}
      />

      <p
        className={`
          mt-3
          text-[10px]
          tracking-[0.12em]
          sm:tracking-[0.35em]

          ${
            active
              ? "text-yellow-300"
              : "text-zinc-600"
          }
        `}
      >
        {label}
      </p>

    </div>
  );
}

function ProgressLine() {

  return (
    <div
      className="
        mb-6
        h-px
        flex-1
        bg-gradient-to-r
        from-yellow-700/40
        to-transparent
        hidden
        sm:block
      "
    />
  );
}
