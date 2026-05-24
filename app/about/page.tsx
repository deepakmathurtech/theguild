import ContentPage from "@/components/guild/ContentPage";
import { pageMetadata } from "@/lib/site";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "About",
  description:
    "Learn how The Central Guild turns learning, contribution, and personal growth into an interactive journey through Adventurers, Quests, Ranks, Guild ID profiles, verification, and community.",
  path: "/about",
});

export default function AboutPage() {
  return <ContentPage slug="about" />;
}
