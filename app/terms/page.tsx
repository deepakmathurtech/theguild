import InfoPageShell from "@/components/guild/InfoPageShell";

export default function TermsPage() {
  return (
    <InfoPageShell
      eyebrow="LEGAL"
      title="Terms And Conditions"
      intro="These terms describe the baseline rules for using The Guild platform and participating in guild activity."
      blocks={[
        {
          title: "Account Responsibility",
          body: "You are responsible for the information submitted through your account and for keeping login credentials private. Do not impersonate another person or submit misleading records.",
        },
        {
          title: "Quest Participation",
          body: "Quest details, acceptance, completion, and rewards are managed by the relevant quest owner or guild staff. The platform records activity but does not guarantee outcomes outside the system.",
        },
        {
          title: "Access Changes",
          body: "Guild staff may approve, limit, update, or remove access when records are inaccurate, abusive behavior is reported, or the system needs protection.",
        },
        {
          title: "Updates",
          body: "These terms may be updated as the guild system evolves. Continued use of the platform means you accept the current terms shown here.",
        },
      ]}
    />
  );
}
