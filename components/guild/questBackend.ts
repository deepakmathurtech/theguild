"use client";

import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* ----------------------------- */
/* TYPES */
/* ----------------------------- */

type CreateQuestParams = {
  user: any;

  guildProfile?: any;

  data: {
    title: string;

    reward: string;

    contactEmail: string;

    deadline: string;

    description: string;

    requiredSkills: string;

    location: string;

    maxApplicants: string | number;

    questTypes: string[];
  };
};

/* ----------------------------- */
/* HELPERS */
/* ----------------------------- */

function cleanText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function extractRewardAmount(
  reward: string
) {
  return (
    parseInt(
      reward.replace(/[^0-9]/g, "")
    ) || 0
  );
}

/* ----------------------------- */
/* VALIDATE QUEST */
/* ----------------------------- */

export async function validateQuestSubmission({
  user,
  data,
}: CreateQuestParams) {

  if (!user) {
    return {
      allowed: false,

      message:
        "You must login first.",
    };
  }

  /* CLEAN INPUTS */
  const title =
    cleanText(data.title);

  const description =
    cleanText(data.description);

  const location =
    cleanText(data.location);

  const reward =
    cleanText(data.reward);

  /* REQUIRED */
  if (
    !title ||
    !reward ||
    !data.contactEmail ||
    !data.deadline ||
    !description ||
    !data.requiredSkills ||
    !location ||
    !data.maxApplicants
  ) {
    return {
      allowed: false,

      message:
        "All guild dossier fields are required.",
    };
  }

  /* TITLE LENGTH */
  if (
    title.length < 5 ||
    title.length > 80
  ) {
    return {
      allowed: false,

      message:
        "Quest title must be between 5 and 80 characters.",
    };
  }

  /* DESCRIPTION */
  if (
    description.length < 30
  ) {
    return {
      allowed: false,

      message:
        "Quest description is too short.",
    };
  }

  /* QUEST TYPES */
  if (
    !Array.isArray(
      data.questTypes
    ) ||
    data.questTypes.length === 0
  ) {
    return {
      allowed: false,

      message:
        "Select at least one quest type.",
    };
  }

  /* APPLICANTS */
  const parsedApplicants =
    Number(data.maxApplicants);

  if (
    isNaN(parsedApplicants) ||
    parsedApplicants <= 0 ||
    parsedApplicants > 100
  ) {
    return {
      allowed: false,

      message:
        "Applicants must be between 1 and 100.",
    };
  }

  /* DEADLINE */
  const deadlineDate =
    new Date(data.deadline);

  if (
    deadlineDate <
    new Date()
  ) {
    return {
      allowed: false,

      message:
        "Deadline cannot be in the past.",
    };
  }

  /* DUPLICATE QUEST CHECK */
  const duplicateQuery =
    query(
      collection(db, "quests"),
      where(
        "titleLower",
        "==",
        title.toLowerCase()
      ),
      limit(1)
    );

  const duplicateSnapshot =
    await getDocs(
      duplicateQuery
    );

  if (
    !duplicateSnapshot.empty
  ) {
    return {
      allowed: false,

      message:
        "A similar quest already exists.",
    };
  }

  return {
    allowed: true,

    message: "Allowed",
  };
}

/* ----------------------------- */
/* CREATE QUEST */
/* ----------------------------- */

export async function createQuest({
  user,
  guildProfile,
  data,
}: CreateQuestParams) {

  if (!user) {
    throw new Error(
      "Unauthorized."
    );
  }

  /* CLEAN */
  const title =
    cleanText(data.title);

  const description =
    cleanText(data.description);

  const location =
    cleanText(data.location);

  const reward =
    cleanText(data.reward);

  const requiredSkills =
    cleanText(
      data.requiredSkills
    );

  /* TYPES */
  const formattedQuestType =
    data.questTypes.join(" / ");

  /* REWARD */
  const rewardAmount =
    extractRewardAmount(
      reward
    );

  /* AUTO DIFFICULTY */
  let difficulty =
    "E-RANK";

  if (
    rewardAmount >= 25000
  ) {
    difficulty = "S-RANK";

  } else if (
    rewardAmount >= 15000
  ) {
    difficulty = "A-RANK";

  } else if (
    rewardAmount >= 7000
  ) {
    difficulty = "B-RANK";

  } else if (
    rewardAmount >= 3000
  ) {
    difficulty = "C-RANK";

  } else if (
    rewardAmount >= 1000
  ) {
    difficulty = "D-RANK";
  }

  /* SEARCH INDEX */
  const searchIndex = [
    title.toLowerCase(),
    location.toLowerCase(),
    ...data.questTypes.map(
      (q) => q.toLowerCase()
    ),
  ];

  /* CREATE */
  const questRef =
    await addDoc(
      collection(db, "quests"),
      {
        /* MAIN */
        title,

        titleLower:
          title.toLowerCase(),

        reward,

        rewardAmount,

        description,

        requiredSkills,

        location,

        contactEmail:
          data.contactEmail.trim(),

        deadline:
          data.deadline,

        maxApplicants:
          Number(
            data.maxApplicants
          ),

        /* TYPES */
        questTypes:
          data.questTypes,

        questTypeLabel:
          formattedQuestType,

        /* STATUS */
        difficulty,

        status: "OPEN",

        verified: false,

        archived: false,

        closed: false,

        expired: false,

        featured: false,

        /* APPLICANTS */
        applicants: [],

        applicantsCount: 0,

        /* SEARCH */
        searchIndex,

        /* CREATOR */
        createdBy:
          user.uid,

        createdByEmail:
          user.email,

        createdByName:
          guildProfile?.name ||
          user.displayName ||
          "Unknown",

        /* META */
        views: 0,

        saves: 0,

        reports: 0,

        guildAssigned:
          true,

        assignedRank:
          difficulty,

        /* TIMESTAMPS */
        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      }
    );

  return {
    success: true,

    questId: questRef.id,
  };
}