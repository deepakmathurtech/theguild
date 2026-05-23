"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  getDocs,
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

  requiredSkills?: string;

  location?: string;

  difficulty: string;

  verified: boolean;

  status: string;

  applicants: any[];

  applicantsCount: number;

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

        /* LOAD FROM questsv1 */
        const questsQuery = query(
          collection(db, "questsv1"),

          where("status", "in", [
            "open",
            "OPEN",
          ])
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

              const vacancyRemaining =
                maxApplicants -
                applicantsCount;

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
                  data.reward ||
                  "Unknown",

                questType:
                  data.questType ||
                  data.questTypeLabel ||
                  data.questTypes?.join(
                    " / "
                  ) ||
                  "QUEST",

                difficulty:
                  data.difficulty ||
                  data.assignedRank ||
                  "F-RANK",

                verified:
                  data.verified ||
                  false,

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
                  "",

                applicants,

                applicantsCount,

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

              /* MUST BE OPEN */
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
