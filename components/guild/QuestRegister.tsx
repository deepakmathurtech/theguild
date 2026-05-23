"use client";

import QuestRegisterUI from "./QuestRegisterUI";

import {
  createQuest,
  validateQuestSubmission,
} from "./questBackend";

import {
  useGuildAuth,
} from "./GuildAuthLogic";

import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

function extractRewardAmount(
  reward: string
) {
  return (
    parseInt(
      reward.replace(/[^0-9]/g, "")
    ) || 0
  );
}

function getDifficulty(
  reward: string
) {
  const rewardAmount =
    extractRewardAmount(reward);

  if (rewardAmount >= 25000) {
    return "S-RANK";
  }

  if (rewardAmount >= 15000) {
    return "A-RANK";
  }

  if (rewardAmount >= 7000) {
    return "B-RANK";
  }

  if (rewardAmount >= 3000) {
    return "C-RANK";
  }

  if (rewardAmount >= 1000) {
    return "D-RANK";
  }

  return "E-RANK";
}

export default function QuestRegister() {

  const {
    user,
    guildProfile,
  } = useGuildAuth();

  async function handleQuestSubmit(
    data: any
  ) {

    // VALIDATE
    const validation =
      await validateQuestSubmission({
        user,
        guildProfile,
        data,
      });

    // BLOCK IF NOT ALLOWED
    if (!validation.allowed) {

      throw new Error(
        validation.message
      );
    }

    // OPTIONAL OLD LOGIC
    await createQuest({
      user,
      guildProfile,
      data,
    });

    const questType =
      data.questTypes.join(" / ");

    const difficulty =
      getDifficulty(data.reward);

    // SAVE TO questsv1 COLLECTION
    await addDoc(
      collection(db, "questsv1"),
      {

        // QUEST DATA
        ...data,

        questType,

        difficulty,

        rewardAmount:
          extractRewardAmount(
            data.reward
          ),

        // CREATOR INFO
        createdBy: user?.uid || null,

        creatorName:
          guildProfile?.name || "Unknown",

        creatorRank:
          guildProfile?.guildRank ||
          "F-RANK",

        creatorAvatar:
          guildProfile?.avatar || "",

        // STATUS
        status: "open",

        verified: true,

        applicants: [],

        completedBy: [],

        // TIMESTAMPS
        createdAt: serverTimestamp(),

      }
    );
  }

  return (
    <QuestRegisterUI
      onSubmit={handleQuestSubmit}
    />
  );
}
