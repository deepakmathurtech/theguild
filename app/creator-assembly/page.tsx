import CreatorAssemblyClient from "./CreatorAssemblyClient";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Guild Creator Assembly — Founding Era Gathering",
  description: "Join the Founding Era of Guild Creators. Sunday, 31st May. An online dark fantasy assembly where video editors, designers, developers, writers, and artists gather to collaborate, complete quests, and build the Guild ecosystem.",
  path: "/creator-assembly",
});

export default function CreatorAssemblyPage() {
  return <CreatorAssemblyClient />;
}
