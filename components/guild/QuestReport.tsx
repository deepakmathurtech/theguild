"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  arrayUnion,
  collection,
  getDocs,
  query,
  updateDoc,
  where,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import {
  useGuildAuth,
} from "./GuildAuthLogic";

export default function QuestReport() {

  const {
    user,
    guildProfile,
  } = useGuildAuth();

  const [report, setReport] =
    useState("");

  const [questId, setQuestId] =
    useState("");

  const [submitted, setSubmitted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {

    async function loadQuest() {

      if (!user) {
        return;
      }

      try {

        const q = query(
          collection(db, "questsv1"),

          where(
            "acceptedApplicantUids",
            "array-contains",
            user.uid
          )
        );

        const snapshot =
          await getDocs(q);

        const activeQuest =
          snapshot.docs.find(
            (quest) => {
              const status = String(
                quest.data().status || ""
              ).toLowerCase();

              return [
                "in_progress",
                "open",
                "report_submitted",
              ].includes(status);
            }
          );

        if (activeQuest) {

          setQuestId(
            activeQuest.id
          );

          const existingReports =
            Array.isArray(
              activeQuest.data().reports
            )
              ? activeQuest.data().reports
              : [];

          if (
            existingReports.some(
              (storedReport: any) =>
                storedReport.uid ===
                  user.uid &&
                [
                  "submitted",
                  "verified",
                ].includes(
                  String(
                    storedReport.status ||
                      "submitted"
                  ).toLowerCase()
                )
            )
          ) {
            setSubmitted(true);
          }
        }

      } catch (error) {

        console.log(error);
      }
    }

    loadQuest();

  }, [user]);

  async function handleSubmit() {

    if (!report.trim()) {

      setError(
        "Mission report cannot be empty."
      );

      return;
    }

    if (!user) {
      setError(
        "Please login before submitting a report."
      );

      return;
    }

    if (!questId) {

      setError(
        "No assigned mission found."
      );

      return;
    }

    try {

      setLoading(true);

      setError("");

      await updateDoc(
        doc(
          db,
          "questsv1",
          questId
        ),
        {
          reportSubmitted:
            true,

          reportText:
            report.trim(),

          reportSubmittedBy:
            user.uid,

          reportSubmittedByName:
            guildProfile?.name ||
            user.displayName ||
            "Unknown",

          reportSubmittedAt:
            serverTimestamp(),

          reports: arrayUnion({
            uid: user.uid,
            name:
              guildProfile?.name ||
              user.displayName ||
              "Unknown",
            text: report.trim(),
            status: "submitted",
            submittedAt:
              new Date().toISOString(),
          }),

          status:
            "report_submitted",

          updatedAt:
            serverTimestamp(),
        }
      );

      setSubmitted(true);

    } catch (error) {

      console.log(error);

      setError(
        "Failed to submit mission report."
      );

    } finally {

      setLoading(false);
    }
  }

  /* SUCCESS */
  if (submitted) {
    return (
      <section
        className="
          relative
          overflow-hidden
          rounded-[34px]
          border
          border-green-900/20
          bg-green-950/10
          p-5
          backdrop-blur-xl
          sm:p-10
        "
      >

        <div className="relative z-10">

          <p
            className="
              text-[10px]
              tracking-[0.22em]
              text-green-500
              sm:tracking-[0.45em]
            "
          >
            GUILD REPORT
          </p>

          <h2
            className="
              font-cinzel
              mt-5
              text-3xl
              text-green-400
              sm:text-4xl
            "
          >
            Report Submitted
          </h2>

          <p
            className="
              font-cormorant
              mt-6
              text-xl
              italic
              leading-relaxed
              text-zinc-400
              sm:text-2xl
            "
          >
            Your operational report has been
            submitted to the guild council for
            manual verification and review.
          </p>

        </div>

      </section>
    );
  }

  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[34px]
        border
        border-yellow-900/20
        bg-black/30
        p-5
        backdrop-blur-xl
        sm:p-10
      "
    >

      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(212,164,75,0.06),transparent_35%)]" />

      <div className="relative z-10">

        <p
          className="
            text-[10px]
            tracking-[0.22em]
            text-yellow-700
            sm:tracking-[0.45em]
          "
        >
          GUILD REPORT
        </p>

        <h2
          className="
            font-cinzel
            mt-5
            text-3xl
            text-yellow-400
            sm:text-4xl
          "
        >
          Submit Mission Report
        </h2>

        <p
          className="
            font-cormorant
            mt-6
            text-xl
            italic
            leading-relaxed
            text-zinc-500
            sm:text-2xl
          "
        >
          Submit your mission progress and
          operational notes for guild review.
        </p>

        {/* ERROR */}
        {error && (
          <div
            className="
              mt-8
              rounded-[20px]
              border
              border-red-900/20
              bg-red-950/10
              p-5
              text-sm
              text-red-400
            "
          >
            {error}
          </div>
        )}

        {/* TEXTAREA */}
        <textarea
          value={report}
          onChange={(e) =>
            setReport(
              e.target.value
            )
          }
          placeholder="Describe completed objectives, encountered issues, operational progress, and guild notes..."
          className="
            font-cormorant
            mt-8
            min-h-44
            w-full
            resize-y
            rounded-[24px]
            border
            border-yellow-900/10
            bg-black/20
            p-4
            text-lg
            italic
            leading-relaxed
            text-zinc-200
            outline-none
            placeholder:text-zinc-600
            focus:border-yellow-700/40
            sm:mt-10
            sm:min-h-52
            sm:p-6
            sm:text-2xl
          "
        />

        {/* BUTTON */}
        <div className="mt-6 flex justify-stretch sm:mt-8 sm:justify-end">

          <button
            onClick={
              handleSubmit
            }
            disabled={
              loading
            }
            className="
              border
              border-yellow-700
              bg-yellow-500/10
              px-5
              py-3
              text-[10px]
              tracking-[0.18em]
              text-yellow-300
              transition
              hover:bg-yellow-500/20
              disabled:opacity-50
              w-full
              sm:w-auto
              sm:px-8
              sm:tracking-[0.35em]
            "
          >
            {loading
              ? "SUBMITTING..."
              : "SUBMIT REPORT"}
          </button>

        </div>

      </div>

    </section>
  );
}
