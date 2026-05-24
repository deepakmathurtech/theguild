import AmbientGlow from "@/components/guild/AmbientGlow";
import BackgroundEmblem from "@/components/guild/BackgroundEmblem";
import GuildNavbar from "@/components/guild/GuildNavbar";
import PublicAdventurerProfile from "@/components/guild/PublicAdventurerProfile";
import { pageMetadata } from "@/lib/site";

export async function generateMetadata(
  props: PageProps<"/[adventurerId]">
) {
  const { adventurerId } =
    await props.params;

  return pageMetadata({
    title: "Profile",
    description: `Public Guild ID profile for ${adventurerId.toUpperCase()}.`,
    path: `/${adventurerId}`,
  });
}

export default async function AdventurerPublicPage(
  props: PageProps<"/[adventurerId]">
) {
  const { adventurerId } =
    await props.params;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#120d08] text-white">
      <div className="fixed inset-0">
        <AmbientGlow />
        <BackgroundEmblem />
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,180,80,0.08),transparent_45%)]" />
      </div>

      <GuildNavbar />

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-32 sm:px-6 sm:pt-36">
        <p className="text-[10px] tracking-[0.45em] text-yellow-700">
          PUBLIC DOSSIER
        </p>
        <p className="mt-3 max-w-2xl text-sm text-zinc-500 sm:text-base">
          Open verification page for guild identity and approved skills.
        </p>

        <div className="mt-10">
          <PublicAdventurerProfile
            adventurerId={adventurerId.toUpperCase()}
          />
        </div>
      </section>
    </main>
  );
}
