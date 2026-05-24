"use client";

import QuestCard from "./QuestCard";

import {
  useVerifiedQuests,
} from "./questData";

type QuestBoardProps = {
  selectedFilter: string;
  searchQuery: string;
};

export default function QuestBoard({
  selectedFilter,
  searchQuery,
}: QuestBoardProps) {
  const {
    quests,
    loading,
    error,
  } = useVerifiedQuests();

  const normalizedSearch =
    searchQuery.trim().toLowerCase();

  const filteredQuests =
    quests.filter((quest) => {
      const type =
        [
          quest.questType,
          quest.category,
          quest.location,
          quest.duration,
          quest.rewardType,
          quest.title,
          quest.description,
        ]
          .join(" ")
          ?.toUpperCase() || "";

      const matchesFilter =
        selectedFilter === "ALL" ||
        type.includes(selectedFilter) ||
        filterAliases(
          selectedFilter
        ).some((alias) =>
          type.includes(alias)
        );

      const searchable = [
        quest.title,
        quest.description,
        quest.reward,
        quest.questType,
        quest.location,
        quest.duration,
        quest.category,
        quest.rewardType,
        quest.requiredSkills,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchable.includes(
          normalizedSearch
        );

      return (
        matchesFilter &&
        matchesSearch
      );
    });

  if (loading) {
    return (
      <section
        className="
          relative
          z-10
          flex
          min-h-[40vh]
          items-center
          justify-center
        "
      >
        <p
          className="
            font-cinzel
            text-lg
            tracking-[0.35em]
            text-yellow-500
          "
        >
          LOADING QUEST BOARD...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-[32vh]
          max-w-3xl
          items-center
          justify-center
          px-6
          text-center
        "
      >
        <div
          className="
            border
            border-red-900/30
            bg-red-950/15
            p-8
            backdrop-blur-xl
          "
        >
          <p className="text-[10px] tracking-[0.4em] text-red-400">
            QUEST BOARD ERROR
          </p>
          <p className="mt-4 text-xl text-zinc-300">
            {error}
          </p>
        </div>
      </section>
    );
  }

  if (!filteredQuests.length) {
    return (
      <section
        className="
          relative
          z-10
          flex
          min-h-[40vh]
          items-center
          justify-center
          px-6
        "
      >
        <div
          className="
            border
            border-yellow-900/20
            bg-black/30
            px-10
            py-12
            text-center
            backdrop-blur-xl
          "
        >
          <p
            className="
              text-[10px]
              tracking-[0.45em]
              text-yellow-700
            "
          >
            GUILD BOARD
          </p>

          <h2
            className="
              font-cinzel
              mt-5
              text-4xl
              text-yellow-400
            "
          >
            No Matching Quests
          </h2>

          <p
            className="
              font-cormorant
              mt-5
              text-2xl
              italic
              text-zinc-500
            "
          >
            Try a different search or quest category.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      key={`${selectedFilter}-${searchQuery}`}
      className="
        relative
        z-10
        mx-auto
        grid
        max-w-7xl
        gap-8
        px-4
        py-10
        sm:px-6
        sm:py-14
        lg:gap-10
        lg:py-16
        md:grid-cols-2
        xl:grid-cols-3
        animate-[fadeIn_0.25s_ease]
      "
    >
      {filteredQuests.map(
        (quest, index) => (
          <QuestCard
            key={`${selectedFilter}-${quest.id}`}
            id={quest.id}
            rank={quest.difficulty}
            type={quest.questType}
            status={quest.status}
            verified={quest.verified}
            questTypes={quest.questTypes}
            category={quest.category}
            location={quest.location}
            duration={quest.duration}
            rewardType={quest.rewardType}
            createdBy={quest.createdBy}
            rewardAmount={
              quest.rewardAmount
            }
            title={quest.title}
            description={
              quest.description
            }
            reward={quest.reward}
            seal={
              index % 3 === 0
                ? "X"
                : index % 3 === 1
                ? "*"
                : "C"
            }
            rotation={
              index % 3 === 0
                ? "sm:-rotate-1"
                : index % 3 === 1
                ? "sm:rotate-1"
                : "sm:-rotate-2"
            }
          />
        )
      )}
    </section>
  );
}

function filterAliases(filter: string) {
  switch (filter) {
    case "PROJECTS":
      return [
        "PROJECT",
        "INITIATIVE",
        "BUILD",
      ];

    case "TASKS":
      return [
        "TASK",
        "WORK",
        "ASSIGNMENT",
      ];

    case "CHALLENGES":
      return [
        "CHALLENGE",
        "CONTEST",
        "SPRINT",
      ];

    case "OPPORTUNITIES":
      return [
        "OPPORTUNITY",
        "INTERNSHIP",
        "ROLE",
        "OPENING",
      ];

    case "COMMUNITY":
      return [
        "COMMUNITY",
        "COLLABORATION",
        "VOLUNTEER",
        "EVENT",
      ];

    default:
      return [];
  }
}
