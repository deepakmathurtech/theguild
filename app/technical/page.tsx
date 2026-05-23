import InfoPageShell from "@/components/guild/InfoPageShell";

export default function TechnicalPage() {
  return (
    <InfoPageShell
      eyebrow="TECHNICAL"
      title="System"
      intro="A quick public view of how the guild platform is structured, secured, and kept efficient."
      blocks={[
        {
          title: "Application Stack",
          body: "The web app runs on Next.js App Router with React, Firebase Authentication, Cloud Firestore, and Firebase security rules for document-level access control.",
        },
        {
          title: "Access Model",
          body: "Users authenticate with Firebase. Adventurer profiles, public profile records, quest data, staff tools, and owner controls are separated through role-aware rules.",
        },
        {
          title: "Read Efficiency",
          body: "Public leaderboard and profile views use public profile documents where possible, avoiding unnecessary reads of full private adventurer records.",
        },
        {
          title: "Identity Generation",
          body: "Guild IDs are generated from city, year, gender, rank, and a Firestore counter so each approved identity remains unique and readable.",
        },
      ]}
    />
  );
}
