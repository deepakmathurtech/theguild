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
        px-6
        pt-36
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

          <p className="text-[10px] tracking-[0.45em] text-yellow-700">
            GUILD QUEST BOARD
          </p>

          <h1
            className="
              font-cinzel
              mt-5
              text-5xl
              text-yellow-400
            "
          >
            Available Quests
          </h1>

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

      <div className="mt-8 max-w-2xl">

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
          placeholder="Search by title, skill, reward, or location"
          className="
            w-full
            border
            border-yellow-900/25
            bg-black/45
            px-5
            py-4
            text-sm
            tracking-[0.08em]
            text-zinc-100
            outline-none
            backdrop-blur-xl
            placeholder:text-zinc-600
            focus:border-yellow-600/60
          "
        />

      </div>

    </section>
  );
}
