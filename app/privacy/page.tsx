import InfoPageShell from "@/components/guild/InfoPageShell";

export default function PrivacyPage() {
  return (
    <InfoPageShell
      eyebrow="LEGAL"
      title="Privacy"
      intro="The Guild stores only the information needed to run accounts, profiles, quests, approvals, and public adventurer records."
      blocks={[
        {
          title: "Information Collected",
          body: "Registration may store your name, email, contact details, city, specialization, experience, portfolio link, guild ID, reputation, and quest activity.",
        },
        {
          title: "Public Profile Data",
          body: "Approved adventurer pages can show public-facing details such as name, guild ID, rank, city, specialization, tagline, portfolio, reputation, and verified skills.",
        },
        {
          title: "Protected Records",
          body: "Private registration records are restricted by Firebase rules. Staff access is used for review, approval, moderation, and system administration.",
        },
        {
          title: "Data Care",
          body: "Keep personal information minimal and relevant. Contact guild staff if profile details need correction or removal from public display.",
        },
      ]}
    />
  );
}
