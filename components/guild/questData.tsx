"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import {
  useGuildAuth,
} from "./GuildAuthLogic";

export type QuestType = {
  id: string;

  title: string;

  description: string;

  reward: string;

  questType: string;

  questTypes?: string[];

  category?: string;

  requiredSkills?: string;

  location?: string;

  duration?: string;

  rewardType?: string;

  rewardAmount?: number;

  difficulty: string;

  verified: boolean;

  status: string;

  applicants: any[];

  applicantsCount: number;

  acceptedApplicantsCount: number;

  maxApplicants: number;

  vacancyRemaining: number;

  userAlreadyApplied: boolean;

  available: boolean;

  createdBy: string;
};

export function useVerifiedQuests() {

  const {
    user,
  } = useGuildAuth();

  const [quests, setQuests] =
    useState<QuestType[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {

    async function loadQuests() {

      try {

        setLoading(true);

        setError("");

        /* LOAD VERIFIED QUESTS ONLY */
        const questsQuery = query(
          collection(db, "questsv1"),
          where("verified", "==", true),
          limit(60)
        );

        const snapshot =
          await getDocs(questsQuery);

        const loadedQuests =
          snapshot.docs
            .map((doc) => {

              const data =
                doc.data();

              const applicants =
                data.applicants || [];

              const maxApplicants =
                Number(
                  data.maxApplicants
                ) || 1;

              const applicantsCount =
                applicants.length;

              const acceptedApplicantUids =
                Array.isArray(
                  data.acceptedApplicantUids
                )
                  ? data.acceptedApplicantUids
                  : [];

              const acceptedApplicantsCount =
                acceptedApplicantUids.length ||
                (Array.isArray(
                  data.acceptedApplicants
                )
                  ? data.acceptedApplicants
                      .length
                  : 0);

              const vacancyRemaining =
                maxApplicants -
                acceptedApplicantsCount;

              /* USER ALREADY APPLIED */
              const userAlreadyApplied =
                applicants.some(
                  (
                    applicant: any
                  ) =>
                    applicant.uid ===
                    user?.uid
                );

              const status =
                String(
                  data.status || "open"
                ).toLowerCase();

              /* QUEST AVAILABLE */
              const available =
                status === "open" &&
                vacancyRemaining >
                  0 &&
                !userAlreadyApplied;

              return {

                id: doc.id,

                title:
                  data.title ||
                  "Unknown Quest",

                description:
                  data.description ||
                  "No description.",

                reward:
                  formatReward(
                    data.reward,
                    data.rewardAmount,
                    data.rewardType
                  ),

                questType:
                  data.questType ||
                  data.questTypeLabel ||
                  data.questTypes?.join(
                    " / "
                  ) ||
                  "QUEST",

                category:
                  data.category ||
                  data.questCategory ||
                  data.questType ||
                  "General",

                difficulty:
                  data.difficulty ||
                  data.assignedRank ||
                  "F-RANK",

                verified:
                Boolean(
                  data.verified
                ),

                status:
                  status ||
                  "open",

                questTypes:
                  data.questTypes ||
                  [],

                requiredSkills:
                  data.requiredSkills ||
                  "",

                location:
                  data.location ||
                  "Remote",

                duration:
                  data.duration ||
                  data.timeline ||
                  "Flexible Duration",

                rewardType:
                  data.rewardType ||
                  "Recognition",

                rewardAmount: Number(
                  data.rewardAmount || 0
                ),

                applicants,

                applicantsCount,

                acceptedApplicantsCount,

                maxApplicants,

                vacancyRemaining,

                userAlreadyApplied,

                available,

                createdBy:
                  data.createdBy ||
                  "",
              };
            })

            /* FILTER INVALID QUESTS */
            .filter((quest) => {

              /* MUST BE VERIFIED + OPEN */
              if (!quest.verified) {
                return false;
              }

              if (
                quest.status !==
                "open"
              ) {
                return false;
              }

              /* MUST HAVE VACANCY */
              if (
                quest.vacancyRemaining <=
                0
              ) {
                return false;
              }

              /* USER MUST NOT ALREADY APPLY */
              if (
                quest.userAlreadyApplied
              ) {
                return false;
              }

              return true;
            });

        setQuests(loadedQuests);

      } catch (error) {

        console.log(error);

        setError(
          "Failed to load guild quests."
        );

      } finally {

        setLoading(false);

      }
    }

    loadQuests();

  }, [user]);

  return {

    quests,

    loading,

    error,
  };
}

function formatReward(
  reward: unknown,
  rewardAmount: unknown,
  rewardType: unknown
) {
  const amount = Number(
    rewardAmount ?? reward
  );

  if (!amount) {
    return "Volunteer / Recognition / XP";
  }

  return (
    String(reward || "").trim() ||
    String(rewardType || "").trim() ||
    "Recognition"
  );
}
