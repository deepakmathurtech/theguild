import InfoPageShell from "@/components/guild/InfoPageShell";

export default function AboutPage() {
  return (
    <InfoPageShell
      eyebrow="ABOUT US"
      title="The Guild"
      intro="A registry and quest board for builders, creators, and operators who want their work recorded with a little ceremony."
      blocks={[
        {
          title: "What We Do",
          body: "The Guild helps members create an adventurer profile, receive a guild identity, discover quests, and track reputation as work is completed.",
        },
        {
          title: "How Approval Works",
          body: "New registrations enter review before full access unlocks. Staff can verify profile details, approve adventurers, and keep public records accurate.",
        },
        {
          title: "Community Standard",
          body: "Members are expected to submit honest profile details, respect quest owners, communicate clearly, and keep shared spaces useful for everyone.",
        },
      ]}
    />
  );
}
