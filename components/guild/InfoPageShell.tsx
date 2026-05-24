import Link from "next/link";

import AmbientGlow from "./AmbientGlow";
import BackgroundEmblem from "./BackgroundEmblem";
import GuildNavbar from "./GuildNavbar";
import {
  socialLinks,
} from "@/lib/site";

type InfoBlock = {
  title: string;
  body: string;
};

type InfoPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  blocks: InfoBlock[];
  updatedAt?: string;
};

export default function InfoPageShell({
  eyebrow,
  title,
  intro,
  blocks,
  updatedAt,
}: InfoPageShellProps) {
  const showSocialLinks =
    eyebrow.toLowerCase().includes("about") ||
    title.toLowerCase().includes("guild");

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#120d08] text-white">
      <div className="fixed inset-0">
        <AmbientGlow />
        <BackgroundEmblem />
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,180,80,0.08),transparent_45%)]" />
      </div>

      <div className="fixed left-0 top-0 z-50 w-full">
        <GuildNavbar />
      </div>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <header className="border-b border-yellow-900/20 pb-8 lg:sticky lg:top-28 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
            <p className="text-[10px] tracking-[0.45em] text-yellow-700">
              {eyebrow}
            </p>
            <h1 className="font-cinzel mt-5 text-4xl text-yellow-400 sm:text-6xl">
              {title}
            </h1>
            <p className="font-cormorant mt-7 text-2xl italic leading-relaxed text-zinc-400">
              {intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="border border-yellow-700/40 bg-yellow-500/10 px-5 py-3 text-[10px] font-black tracking-[0.28em] text-yellow-300 transition hover:bg-yellow-500 hover:text-black"
              >
                LOGIN
              </Link>
              <Link
                href="/register"
                className="border border-white/10 px-5 py-3 text-[10px] tracking-[0.28em] text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                REGISTRY
              </Link>
            </div>
            {updatedAt && (
              <p className="mt-6 text-[10px] tracking-[0.25em] text-zinc-600">
                UPDATED {updatedAt}
              </p>
            )}

            {showSocialLinks && (
              <div className="mt-8 border-t border-yellow-900/20 pt-6">
                <p className="text-[10px] tracking-[0.35em] text-yellow-700">
                  FIND THE GUILD
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {socialLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      target={
                        link.href.startsWith("http")
                          ? "_blank"
                          : undefined
                      }
                      rel={
                        link.href.startsWith("http")
                          ? "noreferrer"
                          : undefined
                      }
                      className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.22em] text-zinc-300 transition hover:border-yellow-700/50 hover:text-yellow-300"
                    >
                      {link.label.toUpperCase()}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </header>

          <div className="grid gap-4">
            {blocks.map((block) => (
              <article
                key={block.title}
                className="border border-yellow-900/20 bg-black/35 p-6 backdrop-blur-xl sm:p-8"
              >
                <h2 className="font-cinzel text-2xl text-yellow-300">
                  {block.title}
                </h2>
                <p className="mt-4 text-base leading-7 text-zinc-400">
                  {block.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
