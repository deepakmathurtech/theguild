"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  getDocs,
  query,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import {
  useGuildAuth,
} from "./GuildAuthLogic";

import YourQuestUI from "./YourQuestUI";

export default function YourQuest() {

  const {
    user,
  } = useGuildAuth();

  const [quest, setQuest] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    async function loadAssignedQuest() {

      /* NO USER */
      if (!user) {

        setLoading(false);

        return;
      }

      try {

        setLoading(true);

        /* LOAD FROM questsv1 */
        const q = query(
          collection(
            db,
            "questsv1"
          )
        );

        const snapshot =
          await getDocs(q);

        /* FIND QUEST WHERE USER IS APPLICANT */
        const matchedQuest =
          snapshot.docs.find(
            (doc) => {

              const data =
                doc.data();

              const applicants =
                Array.isArray(
                  data.applicants
                )
                  ? data.applicants
                  : [];

              return applicants.some(
                (
                  applicant: any
                ) =>
                  applicant.uid ===
                  user.uid
              );
            }
          );

        /* NO QUEST */
        if (!matchedQuest) {

          setQuest(null);

          return;
        }

        /* QUEST DATA */
        const questData =
          matchedQuest.data();

        /* SAVE QUEST */
        setQuest({

          id: matchedQuest.id,

          ...questData,

          applicantsCount:
            Array.isArray(
              questData.applicants
            )
              ? questData.applicants
                  .length
              : 0,
        });

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);

      }
    }

    loadAssignedQuest();

  }, [user]);

  return (
    <YourQuestUI
      loading={loading}
      quest={quest}
    />
  );
}