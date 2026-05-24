import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Login",
  description:
    "Log in to The Central Guild or become an Adventurer to build your Guild ID, complete verified Quests, and grow through community contribution.",
  path: "/login",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
