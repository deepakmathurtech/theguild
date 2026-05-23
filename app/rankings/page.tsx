import AmbientGlow from "@/components/guild/AmbientGlow";
import BackgroundEmblem from "@/components/guild/BackgroundEmblem";
import GuildNavbar from "@/components/guild/GuildNavbar";
import RankingsBoard from "@/components/guild/RankingsBoard";

export default function RankingsPage() {
  return (
    <main
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-[#120d08]
        text-white
      "
    >
      <div className="fixed inset-0">
        <AmbientGlow />
        <BackgroundEmblem />
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,180,80,0.08),transparent_45%)]" />
      </div>

      <GuildNavbar />

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-36">
        <p className="text-[10px] tracking-[0.45em] text-yellow-700">
          GUILD LEDGER
        </p>

        <h1 className="font-cinzel mt-5 text-5xl text-yellow-400">
          Adventurer Rankings
        </h1>

        <p className="mt-5 max-w-3xl text-xl italic leading-relaxed text-zinc-400">
          Track reputation, completed quests, approval status, and
          the strongest names currently recorded in the guild.
        </p>

        <RankingsBoard />
      </section>
    </main>
  );
}
