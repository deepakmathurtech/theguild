import {
  doc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";

type AdventurerPublicSource = {
  uid?: string;
  adventurerId?: string;
  name?: string;
  guildRank?: string;
  specialization?: string;
  cityName?: string;
  publicTagline?: string;
  skillsVerified?: string[];
  portfolioUrl?: string;
  questsCompleted?: number;
  reputation?: number;
  approved?: boolean;
};

export async function upsertPublicAdventurerProfile(
  db: Firestore,
  uid: string,
  data: AdventurerPublicSource
) {
  await setDoc(
    doc(db, "publicAdventurerProfiles", uid),
    {
      uid,
      adventurerId:
        data.adventurerId || "",
      name: data.name || "",
      guildRank:
        data.guildRank || "",
      specialization:
        data.specialization || "",
      cityName:
        data.cityName || "",
      publicTagline:
        data.publicTagline || "",
      skillsVerified:
        data.skillsVerified || [],
      portfolioUrl:
        data.portfolioUrl || "",
      questsCompleted:
        data.questsCompleted || 0,
      reputation:
        data.reputation || 0,
      approved:
        Boolean(data.approved),
      updatedAt:
        serverTimestamp(),
    },
    { merge: true }
  );
}
