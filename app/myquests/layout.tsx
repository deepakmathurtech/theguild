import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "My Contributions",
  description:
    "Track accepted quests, submitted reports, verification, and completed contributions.",
  path: "/myquests",
});

export default function MyQuestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
