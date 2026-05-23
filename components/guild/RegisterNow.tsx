import Link from "next/link";

export default function RegisterNow() {
  return (
    <section
      className="
        relative
        flex
        min-h-screen
        items-center
        justify-center
        px-6
      "
    >

      <div
        className="
          relative
          w-full
          max-w-2xl
          overflow-hidden
          rounded-[32px]
          border
          border-yellow-900/20
          bg-black/40
          p-14
          text-white
          backdrop-blur-xl
        "
      >

        {/* Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,164,75,0.08),transparent_40%)]" />

        <div className="relative z-10">

          <p className="text-[10px] tracking-[0.45em] text-yellow-700">
            GUILD ACCESS DENIED
          </p>

          <h1
            className="
              font-cinzel
              mt-5
              text-5xl
              text-yellow-400
            "
          >
            Adventurer Registration Required
          </h1>

          <p
            className="
              font-cormorant
              mt-8
              text-3xl
              italic
              leading-relaxed
              text-zinc-400
            "
          >
            Only officially registered guild
            adventurers may access quests,
            rankings, and guild archives.
          </p>

          <div className="mt-12 flex gap-5">

            <Link
              href="/register"
              className="
                border-[3px]
                border-yellow-700
                px-8
                py-3
                text-[10px]
                font-black
                tracking-[0.35em]
                text-yellow-400
                transition
                hover:bg-yellow-500
                hover:text-black
              "
            >
              REGISTER NOW
            </Link>

            <Link
              href="/"
              className="
                border
                border-white/10
                px-8
                py-3
                text-[10px]
                tracking-[0.35em]
                text-zinc-400
                transition
                hover:border-white/20
                hover:text-white
              "
            >
              RETURN
            </Link>

          </div>

        </div>

      </div>

    </section>
  );
}