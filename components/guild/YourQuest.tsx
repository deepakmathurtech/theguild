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
          ),
          where(
            "acceptedApplicantUids",
            "array-contains",
            user.uid
          )
        );

        const snapshot =
          await getDocs(q);

        /* FIND QUEST WHERE USER IS APPLICANT */
        const matchedQuest =
          snapshot.docs.find(
            (doc) => {
              const status = String(
                doc.data().status || ""
              ).toLowerCase();

              return [
                "in_progress",
                "open",
                "report_submitted",
                "completed",
              ].includes(status);
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
        const reports =
          Array.isArray(
            questData.reports
          )
            ? questData.reports
            : [];
        const userReports =
          reports.filter(
            (report: any) =>
              report.uid === user.uid
          );
        const latestUserReport =
          userReports[
            userReports.length - 1
          ];

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

          userReportStatus:
            latestUserReport?.status ||
            "",

          userReportReputation:
            latestUserReport?.reputationAward,
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
