import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Registry",
  description:
    "Complete your Adventurer profile and Guild ID registration to start building a verified record of skills, experience, and achievements.",
  path: "/register",
});

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
