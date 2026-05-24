"use client";

import QuestFilters from "./QuestFilters";

type QuestHeaderProps = {
  selectedFilter: string;

  setSelectedFilter: (
    value: string
  ) => void;

  searchQuery: string;

  setSearchQuery: (
    value: string
  ) => void;
};

export default function QuestHeader({
  selectedFilter,
  setSelectedFilter,
  searchQuery,
  setSearchQuery,
}: QuestHeaderProps) {

  return (
    <section
      className="
        relative
        z-10
        mx-auto
        max-w-7xl
        px-4
        pt-32
        sm:px-6
        sm:pt-36
      "
    >

      <div
        className="
          flex
          flex-col
          gap-8
          lg:flex-row
          lg:items-end
          lg:justify-between
        "
      >

        <div>

          <p className="text-[10px] tracking-[0.28em] text-yellow-700 sm:tracking-[0.45em]">
            GUILD QUEST BOARD
          </p>

          <h1
            className="
              font-cinzel
              mt-5
              text-4xl
              text-yellow-400
              sm:text-5xl
            "
          >
            Available Quests
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-500">
            Verified projects, tasks, challenges, initiatives, and opportunities where Adventurers build real experience through contribution.
          </p>

        </div>

        <QuestFilters
          selectedFilter={
            selectedFilter
          }
          setSelectedFilter={
            setSelectedFilter
          }
        />

      </div>

      <div className="mt-7 max-w-2xl sm:mt-8">

        <label
          htmlFor="quest-search"
          className="sr-only"
        >
          Search quests
        </label>

        <input
          id="quest-search"
          type="search"
          value={searchQuery}
          onChange={(event) =>
            setSearchQuery(
              event.target.value
            )
          }
          placeholder="Search by quest, skill, project, task, rank, location, or reward"
          className="
            w-full
            border
            border-yellow-900/25
            bg-black/45
            px-5
            py-4
            text-sm
            tracking-[0.02em]
            text-zinc-100
            outline-none
            backdrop-blur-xl
            placeholder:text-zinc-600
            focus:border-yellow-600/60
            sm:tracking-[0.08em]
          "
        />

      </div>

    </section>
  );
}
