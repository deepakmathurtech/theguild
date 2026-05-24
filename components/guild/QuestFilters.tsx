"use client";

type QuestFiltersProps = {
  selectedFilter: string;

  setSelectedFilter: (
    filter: string
  ) => void;
};

const filters = [
  "ALL",
  "PROJECTS",
  "TASKS",
  "CHALLENGES",
  "OPPORTUNITIES",
  "COMMUNITY",
];

export default function QuestFilters({
  selectedFilter,
  setSelectedFilter,
}: QuestFiltersProps) {

  return (
    <div
      className="
        flex
        flex-wrap
        gap-2
        sm:gap-3
      "
    >

      {filters.map((filter) => {

        const active =
          selectedFilter === filter;

        return (
          <button
            key={filter}
            onClick={() =>
              setSelectedFilter(filter)
            }
            className={`
              relative
              overflow-hidden
              border
              px-3
              py-2
              text-[10px]
              tracking-[0.16em]
              transition
              duration-300
              sm:px-5
              sm:tracking-[0.35em]

              ${
                active
                  ? `
                    border-yellow-700
                    bg-yellow-500/10
                    text-yellow-300
                    shadow-[0_0_20px_rgba(234,179,8,0.12)]
                  `
                  : `
                    border-zinc-800
                    bg-black/30
                    text-zinc-400
                    hover:border-yellow-700
                    hover:text-yellow-300
                  `
              }
            `}
          >

            {/* Glow */}
            {active && (
              <div
                className="
                  absolute
                  inset-0
                  bg-[radial-gradient(circle_at_center,rgba(255,210,120,0.12),transparent_70%)]
                "
              />
            )}

            <span className="relative z-10">
              {filter}
            </span>

          </button>
        );
      })}

    </div>
  );
}
