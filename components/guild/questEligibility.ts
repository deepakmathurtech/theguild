import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* ----------------------------- */
/* TYPES */
/* ----------------------------- */

type AcceptQuestParams = {
  questId: string;

  user: any;

  guildProfile: any;
};

type ValidationResponse = {
  allowed: boolean;

  message: string;

  questData?: any;
};

/* ----------------------------- */
/* VALIDATION */
/* ----------------------------- */

export async function canAcceptQuest({
  questId,
  user,
  guildProfile,
}: AcceptQuestParams): Promise<ValidationResponse> {

  try {

    /* USER CHECK */
    if (!user) {
      return {
        allowed: false,
        message:
          "You must login first.",
      };
    }

    /* PROFILE CHECK */
    if (!guildProfile) {
      return {
        allowed: false,
        message:
          "You must register as an adventurer.",
      };
    }

    /* APPROVAL CHECK */
    if (!guildProfile.approved) {
      return {
        allowed: false,
        message:
          "Your adventurer profile is pending approval.",
      };
    }

    /* FETCH QUEST FROM questsv1 */
    const questRef = doc(
      db,
      "questsv1",
      questId
    );

    const questSnap =
      await getDoc(questRef);

    /* EXISTS */
    if (!questSnap.exists()) {
      return {
        allowed: false,
        message:
          "Quest no longer exists.",
      };
    }

    const questData =
      questSnap.data();

    /* STATUS */
    if (
      questData.status !== "open"
    ) {
      return {
        allowed: false,
        message:
          "Quest is closed.",
      };
    }

    /* APPLICANTS */
    const applicants =
      Array.isArray(
        questData.applicants
      )
        ? questData.applicants
        : [];

    /* DUPLICATE CHECK */
    const alreadyApplied =
      applicants.some(
        (applicant: any) =>
          applicant.uid === user.uid
      );

    if (alreadyApplied) {
      return {
        allowed: false,
        message:
          "You already applied for this quest.",
      };
    }

    /* LIMIT CHECK */
    const maxApplicants =
      Number(
        questData.maxApplicants
      ) || 1;

    if (
      applicants.length >=
      maxApplicants
    ) {
      return {
        allowed: false,
        message:
          "Quest applicant limit reached.",
      };
    }

    /* SUCCESS */
    return {
      allowed: true,
      message: "Allowed",
      questData,
    };

  } catch (error) {

    console.log(error);

    return {
      allowed: false,
      message:
        "Failed to validate quest.",
    };
  }
}

/* ----------------------------- */
/* ACCEPT QUEST */
/* ----------------------------- */

export async function acceptQuest({
  questId,
  user,
  guildProfile,
}: AcceptQuestParams) {

  if (!user || !guildProfile) {
    throw new Error(
      "Missing user or guild profile."
    );
  }

  /* questsv1 */
  const questRef = doc(
    db,
    "questsv1",
    questId
  );

  /* TRANSACTION */
  await runTransaction(
    db,
    async (transaction) => {

      const questSnap =
        await transaction.get(
          questRef
        );

      /* EXISTS */
      if (!questSnap.exists()) {
        throw new Error(
          "Quest not found."
        );
      }

      const questData =
        questSnap.data();

      /* STATUS */
      if (
        questData.status !== "open"
      ) {
        throw new Error(
          "Quest closed."
        );
      }

      /* APPLICANTS */
      const applicants =
        Array.isArray(
          questData.applicants
        )
          ? questData.applicants
          : [];

      /* DUPLICATE CHECK */
      const alreadyApplied =
        applicants.some(
          (applicant: any) =>
            applicant.uid === user.uid
        );

      if (alreadyApplied) {
        throw new Error(
          "Already applied."
        );
      }

      /* LIMIT CHECK */
      const maxApplicants =
        Number(
          questData.maxApplicants
        ) || 1;

      if (
        applicants.length >=
        maxApplicants
      ) {
        throw new Error(
          "Applicant limit reached."
        );
      }

      /* NEW APPLICANT */
      const newApplicant = {

        uid: user.uid,

        name:
          guildProfile.name ||
          "Unknown",

        email:
          guildProfile.email ||
          user.email ||
          "Unknown",

        rank:
          guildProfile.guildRank ||
          "F-RANK",

        reputation:
          guildProfile.reputation ||
          0,

        avatar:
          guildProfile.avatar || "",

        acceptedAt:
          new Date().toISOString(),
      };

      /* UPDATE QUEST */
      transaction.update(
        questRef,
        {

          applicants: [
            ...applicants,
            newApplicant,
          ],

          applicantsCount:
            applicants.length + 1,

          updatedAt:
            serverTimestamp(),

        }
      );
    }
  );
}