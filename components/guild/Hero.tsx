import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section
      className="
        relative
        z-10
        flex
        min-h-[100dvh]
        flex-col
        items-center
        justify-center
        px-4
        pt-24
        pb-16
        text-center
        sm:px-6
        md:min-h-[85vh]
        md:px-8
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          flex
          items-center
          justify-center
        "
      >
        <Image
          src="/guild-logo.png"
          alt="Guild Background Emblem"
          width={700}
          height={700}
          priority
          className="
            w-[120vw]
            max-w-[700px]
            scale-110
            select-none
            opacity-[0.08]
            blur-[1px]
            drop-shadow-[0_0_80px_rgba(212,164,75,0.15)]
          "
        />
      </div>

      <p
        className="
          relative
          mb-5
          text-[10px]
          tracking-[0.45em]
          text-yellow-700
          sm:text-xs
          md:tracking-[0.6em]
        "
      >
        ADVENTURER ASSOCIATION
      </p>

      <h1
        className="
          relative
          text-4xl
          font-black
          tracking-[0.18em]
          text-yellow-400
          sm:text-5xl
          md:text-7xl
          md:tracking-[0.35em]
          lg:text-8xl
        "
      >
        THE GUILD
      </h1>

      <p
        className="
          relative
          mt-6
          max-w-2xl
          px-2
          text-xs
          leading-loose
          tracking-[0.18em]
          text-zinc-400
          sm:text-sm
          md:mt-8
          md:text-base
          md:tracking-[0.25em]
        "
      >
        ENTER AS UNKNOWN. LEAVE AS LEGEND.
      </p>

      <div
        className="
          relative
          mt-12
          grid
          w-full
          max-w-3xl
          gap-3
          sm:grid-cols-3
        "
      >
        <Link
          href="/quests"
          className="
            border
            border-yellow-700
            bg-yellow-500/10
            px-6
            py-4
            text-[10px]
            tracking-[0.3em]
            text-yellow-300
            transition-all
            duration-300
            hover:scale-[1.02]
            hover:bg-yellow-500/20
            hover:text-yellow-200
          "
        >
          VIEW QUESTS
        </Link>

        <Link
          href="/questregister"
          className="
            border
            border-zinc-800
            bg-zinc-900/30
            px-6
            py-4
            text-[10px]
            tracking-[0.3em]
            text-zinc-300
            transition-all
            duration-300
            hover:scale-[1.02]
            hover:border-yellow-600
            hover:text-yellow-300
          "
        >
          POST QUEST
        </Link>

        <Link
          href="/login"
          className="
            border
            border-zinc-800
            bg-zinc-900/30
            px-6
            py-4
            text-[10px]
            tracking-[0.3em]
            text-zinc-300
            transition-all
            duration-300
            hover:scale-[1.02]
            hover:border-yellow-600
            hover:text-yellow-300
          "
        >
          JOIN GUILD
        </Link>
      </div>

      <div
        className="
          relative
          mt-12
          grid
          w-full
          max-w-3xl
          gap-3
          text-left
          sm:grid-cols-3
        "
      >
        {[
          ["01", "Browse open work"],
          ["02", "Apply with your guild card"],
          ["03", "Track your active quest"],
        ].map(([step, label]) => (
          <div
            key={step}
            className="
              border
              border-yellow-900/20
              bg-black/30
              p-4
              backdrop-blur-md
            "
          >
            <p className="text-[10px] tracking-[0.3em] text-yellow-700">
              {step}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              {label}
            </p>
          </div>
        ))}
      </div>

      <p
        className="
          relative
          mt-16
          text-[9px]
          tracking-[0.45em]
          text-yellow-700
          sm:text-[10px]
          md:tracking-[0.7em]
        "
      >
        STRIVE | SURPASS | SOVEREIGN
      </p>
    </section>
  );
}
