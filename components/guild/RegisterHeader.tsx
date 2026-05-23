export default function RegisterHeader() {
  return (
    <section className="relative z-10 px-6 pt-12">

      <div className="mx-auto max-w-5xl border border-yellow-900/20 bg-black/20 px-8 py-10 backdrop-blur-sm">

        <p className="text-[10px] tracking-[0.5em] text-yellow-700">
          GUILD ENROLLMENT
        </p>

        <h1 className="mt-5 text-4xl font-black tracking-[0.2em] text-yellow-400 md:text-5xl">
          ADVENTURER REGISTRY
        </h1>

        <p className="mt-5 max-w-2xl text-sm leading-relaxed tracking-[0.08em] text-zinc-500">
          Complete your registration to officially enter
          the guild and begin accepting quests.
        </p>

      </div>

    </section>
  );
}