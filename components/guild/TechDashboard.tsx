"use client";

import { useEffect, useMemo, useState } from "react";

import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  pendingApplicantCount,
  pendingReportCount,
  prioritySort,
  questMatchesFilter,
  questMatchesSearch,
  questQueueStats,
  type QuestQueueFilter,
} from "@/lib/operationsQueue";
import {
  rejectQuestReport,
  verifyQuestReportAndUpdateProfile,
} from "@/lib/questCompletion";
import {
  acceptQuestApplicant,
  rejectQuestApplicant,
} from "@/lib/questStaffActions";

import {
  createAnnouncement,
  loadAnnouncements,
  updateAnnouncement,
  type GuildAnnouncement,
} from "./guildAnnouncements";
import AdventurerProfileLookup from "./AdventurerProfileLookup";

type TechQuest = {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  verified?: boolean;
  reward?: string;
  difficulty?: string;
  questType?: string;
  maxApplicants?: number;
  deadline?: string;
  location?: string;
  applicants?: unknown[];
  acceptedApplicants?: unknown[];
  acceptedApplicantUids?: string[];
  acceptedApplicantsCount?: number;
  rejectedApplicantUids?: string[];
  reports?: Array<{
    uid?: string;
    name?: string;
    text?: string;
    status?: string;
    submittedAt?: string;
    reputationAward?: number;
  }>;
  reportSubmitted?: boolean;
  reportSubmittedBy?: string;
  reportSubmittedByName?: string;
  reportText?: string;
  views?: number;
  featured?: boolean;
};

export default function TechDashboard() {
  const [quests, setQuests] =
    useState<TechQuest[]>([]);
  const [announcements, setAnnouncements] =
    useState<GuildAnnouncement[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [message, setMessage] =
    useState("");
  const [announcementTitle, setAnnouncementTitle] =
    useState("");
  const [announcementBody, setAnnouncementBody] =
    useState("");
  const [editingQuest, setEditingQuest] =
    useState<Record<string, Partial<TechQuest>>>(
      {}
    );
  const [reportReputation, setReportReputation] =
    useState<Record<string, string>>({});
  const [questQueueFilter, setQuestQueueFilter] =
    useState<QuestQueueFilter>(
      "attention"
    );
  const [questSearch, setQuestSearch] =
    useState("");
  const [locationFilter, setLocationFilter] =
    useState("all");
  const [refreshedAt, setRefreshedAt] =
    useState<Date | null>(null);

  async function loadTechData() {
    setLoading(true);
    setMessage("");

    try {
      const [questSnapshot, loadedAnnouncements] =
        await Promise.all([
          getDocs(
            collection(db, "questsv1")
          ),
          loadAnnouncements(),
        ]);

      setQuests(
        questSnapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as TechQuest),
          id: docSnap.id,
        }))
      );

      setAnnouncements(
        loadedAnnouncements.filter(
          (announcement) =>
            announcement.type ===
              "ops" ||
            announcement.type ===
              "event"
        )
      );
      setRefreshedAt(new Date());
    } catch (error) {
      console.log(error);
      setMessage(
        "Unable to load tech console data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(
      loadTechData,
      0
    );

    return () =>
      window.clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const queue = questQueueStats(quests);

    return {
      total: quests.length,
      open: quests.filter(
        (quest) =>
          String(
            quest.status || ""
          ).toLowerCase() === "open"
      ).length,
      accepted: quests.reduce(
        (total, quest) =>
          total +
          (quest.acceptedApplicantUids
            ?.length ||
            quest.acceptedApplicantsCount ||
            0),
        0
      ),
      queue,
    };
  }, [quests]);

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          quests
            .map((quest) =>
              String(
                quest.location || ""
              ).trim()
            )
            .filter(Boolean)
        )
      ).sort((first, second) =>
        first.localeCompare(second)
      ),
    [quests]
  );

  const visibleQuests = useMemo(
    () =>
      prioritySort(
        quests.filter(
          (quest) =>
            questMatchesFilter(
              quest,
              questQueueFilter
            ) &&
            questMatchesSearch(
              quest,
              questSearch
            ) &&
            (locationFilter === "all" ||
              quest.location ===
                locationFilter)
        )
      ),
    [
      locationFilter,
      quests,
      questQueueFilter,
      questSearch,
    ]
  );

  async function updateQuest(
    id: string,
    data: Partial<TechQuest>
  ) {
    await updateDoc(
      doc(db, "questsv1", id),
      {
        ...data,
        updatedAt: serverTimestamp(),
      }
    );

    await loadTechData();
  }

  async function saveQuestEdits(
    quest: TechQuest
  ) {
    const draft =
      editingQuest[quest.id] || {};

    await updateQuest(quest.id, {
      title:
        draft.title ?? quest.title,
      reward:
        draft.reward ?? quest.reward,
      difficulty:
        draft.difficulty ?? quest.difficulty,
      questType:
        draft.questType ?? quest.questType,
      maxApplicants:
        Number(
          draft.maxApplicants ??
            quest.maxApplicants ??
            1
        ),
      deadline:
        draft.deadline ?? quest.deadline,
      location:
        draft.location ?? quest.location,
      description:
        draft.description ??
        quest.description,
    });

    setEditingQuest((current) => {
      const next = { ...current };
      delete next[quest.id];
      return next;
    });
  }

  async function verifyReport(
    quest: TechQuest,
    reportUid: string
  ) {
    try {
      const key = `${quest.id}:${reportUid}`;
      const reputationAward =
        Number(reportReputation[key]) || 0;

      await verifyQuestReportAndUpdateProfile(
        db,
        quest,
        reportUid,
        reputationAward
      );

      await loadTechData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Unable to verify report."
      );
    }
  }

  async function handleRejectReport(
    quest: TechQuest,
    reportUid: string
  ) {
    try {
      await rejectQuestReport(
        db,
        quest,
        reportUid
      );
      await loadTechData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Unable to reject report."
      );
    }
  }

  async function handleAcceptApplicant(
    quest: TechQuest,
    applicant: any
  ) {
    try {
      setMessage("");
      await acceptQuestApplicant(
        db,
        quest.id,
        applicant
      );
      await loadTechData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Unable to accept applicant."
      );
    }
  }

  async function handleRejectApplicant(
    quest: TechQuest,
    applicant: any
  ) {
    try {
      setMessage("");
      await rejectQuestApplicant(
        db,
        quest.id,
        applicant
      );
      await loadTechData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Unable to reject applicant."
      );
    }
  }

  async function handleOpsAnnouncement() {
    if (
      !announcementTitle.trim() ||
      !announcementBody.trim()
    ) {
      setMessage(
        "Ops announcement title and body are required."
      );
      return;
    }

    await createAnnouncement({
      title:
        announcementTitle.trim(),
      body: announcementBody.trim(),
      type: "ops",
      pinned: false,
      active: true,
      author: "Guild Tech Team",
      role: "tech",
    });

    setAnnouncementTitle("");
    setAnnouncementBody("");
    await loadTechData();
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ConsoleStat
          label="TOTAL"
          value={String(stats.total)}
        />
        <ConsoleStat
          label="OPEN"
          value={String(stats.open)}
        />
        <ConsoleStat
          label="NEEDS ATTENTION"
          value={String(
            stats.queue.attention
          )}
        />
        <ConsoleStat
          label="TO VERIFY"
          value={String(
            stats.queue.verification
          )}
        />
        <ConsoleStat
          label="REPORTS WAITING"
          value={String(stats.queue.reports)}
        />
        <ConsoleStat
          label="APPLICANTS WAITING"
          value={String(
            stats.queue.applicants
          )}
        />
        <ConsoleStat
          label="ACCEPTED"
          value={String(stats.accepted)}
        />
      </div>

      {message && (
        <div className="border border-red-900/30 bg-red-950/20 p-5 text-red-200">
          {message}
        </div>
      )}

      <section className="border border-yellow-900/20 bg-black/35 p-4 sm:p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.45em] text-yellow-700">
              TECH OPERATIONS
            </p>
            <h2 className="font-cinzel mt-3 text-2xl sm:text-3xl text-yellow-400">
              Quest Monitor
            </h2>
          </div>
          <button
            type="button"
            onClick={loadTechData}
            className="border border-yellow-700/40 px-5 py-3 text-[10px] tracking-[0.3em] text-yellow-300"
          >
            REFRESH
          </button>
        </div>

        <div className="mt-6 grid gap-3 border border-white/10 bg-black/20 p-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_auto] xl:items-end">
          <div>
            <label htmlFor="tech-quest-search" className="mb-2 block text-[10px] tracking-[0.24em] text-yellow-700">
              SEARCH QUESTS
            </label>
            <input
              id="tech-quest-search"
              type="search"
              value={questSearch}
              onChange={(event) =>
                setQuestSearch(
                  event.target.value
                )
              }
              placeholder="Title, type, location, status"
              className="min-h-12 w-full border border-white/10 bg-black px-4 py-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label htmlFor="tech-queue-filter" className="mb-2 block text-[10px] tracking-[0.24em] text-yellow-700">
              WORK QUEUE
            </label>
            <select
              id="tech-queue-filter"
              value={questQueueFilter}
              onChange={(event) =>
                setQuestQueueFilter(
                  event.target
                    .value as QuestQueueFilter
                )
              }
              className="min-h-12 w-full border border-white/10 bg-black px-4 py-3 text-sm text-zinc-200"
            >
              <option value="attention">
                Needs attention
              </option>
              <option value="verification">
                Awaiting verification
              </option>
              <option value="reports">
                Reports to review
              </option>
              <option value="applicants">
                Applicants to decide
              </option>
              <option value="open">
                Open quests
              </option>
              <option value="closed">
                Closed quests
              </option>
              <option value="all">
                All quests
              </option>
            </select>
          </div>
          <div>
            <label htmlFor="tech-location-filter" className="mb-2 block text-[10px] tracking-[0.24em] text-yellow-700">
              LOCATION
            </label>
            <select
              id="tech-location-filter"
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(
                  event.target.value
                )
              }
              className="min-h-12 w-full border border-white/10 bg-black px-4 py-3 text-sm text-zinc-200"
            >
              <option value="all">
                All locations
              </option>
              {locations.map((location) => (
                <option
                  key={location}
                  value={location}
                >
                  {location}
                </option>
              ))}
            </select>
          </div>
          <div className="pb-3 text-[10px] tracking-[0.2em] text-zinc-500">
            <p>
              {visibleQuests.length} QUESTS
            </p>
            {refreshedAt && (
              <p className="mt-2">
                UPDATED{" "}
                {refreshedAt.toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-[10px] tracking-[0.4em] text-yellow-500">
            LOADING QUESTS...
          </p>
        ) : (
          <div className="mt-6 grid gap-4">
            {!visibleQuests.length && (
              <p className="border border-white/10 bg-black/25 p-5 text-sm text-zinc-400">
                No quests match this work queue.
              </p>
            )}
            {visibleQuests.map((quest) => (
              <article
                key={quest.id}
                className="grid gap-4 border border-white/10 bg-black/25 p-4 sm:p-5 xl:grid-cols-[1fr_auto]"
              >
                <div>
                  <h3 className="font-cinzel text-xl sm:text-2xl text-zinc-100">
                    {quest.title ||
                      "Untitled quest"}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-500">
                    {quest.questType ||
                      "GENERAL"}{" "}
                    |{" "}
                    {quest.reward ||
                      "Unknown reward"}{" "}
                    | Applications{" "}
                    {quest.applicants?.length ||
                      0}
                    {" "} | Accepted{" "}
                    {quest.acceptedApplicantUids
                      ?.length ||
                      quest.acceptedApplicantsCount ||
                      0}
                    /
                    {quest.maxApplicants || 1}
                  </p>
                  <p className="mt-3 text-[10px] tracking-[0.28em] text-yellow-700">
                    {quest.verified
                      ? "VERIFIED"
                      : "UNVERIFIED"}{" "}
                    | STATUS{" "}
                    {quest.status || "open"}{" "}
                    |{" "}
                    {quest.featured
                      ? "FEATURED"
                      : "STANDARD"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!quest.verified && (
                      <AttentionBadge label="VERIFY QUEST" />
                    )}
                    {pendingReportCount(quest) >
                      0 && (
                      <AttentionBadge
                        label={`${pendingReportCount(
                          quest
                        )} REPORTS`}
                      />
                    )}
                    {pendingApplicantCount(
                      quest
                    ) > 0 && (
                      <AttentionBadge
                        label={`${pendingApplicantCount(
                          quest
                        )} APPLICANTS`}
                      />
                    )}
                  </div>
                  {Array.isArray(quest.reports) &&
                    quest.reports.length >
                      0 && (
                      <div className="mt-4 border border-green-900/30 bg-green-950/10 p-4">
                        <p className="text-[10px] tracking-[0.28em] text-green-400">
                          REPORT REVIEW
                        </p>
                        <div className="mt-3 grid gap-3">
                          {quest.reports.map(
                            (
                              report,
                              index
                            ) => {
                              const status =
                                String(
                                  report.status ||
                                    "submitted"
                                ).toLowerCase();
                              const key = `${quest.id}:${report.uid}`;

                              return (
                                <div
                                  key={`${report.uid}-${report.submittedAt}-${index}`}
                                  className="border border-white/10 bg-black/20 p-3"
                                >
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                      <p className="text-sm text-zinc-100">
                                        {report.name ||
                                          "Adventurer"}{" "}
                                        |{" "}
                                        {status.toUpperCase()}
                                      </p>
                                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                                        {report.text ||
                                          "No report text stored."}
                                      </p>
                                      {report.reputationAward !==
                                        undefined && (
                                        <p className="mt-2 text-xs text-green-300">
                                          Reputation +{report.reputationAward}
                                        </p>
                                      )}
                                    </div>
                                    {status ===
                                      "submitted" && (
                                      <div className="grid gap-2 sm:grid-cols-[120px_1fr_1fr]">
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            reportReputation[
                                              key
                                            ] || ""
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            setReportReputation(
                                              (
                                                current
                                              ) => ({
                                                ...current,
                                                [key]:
                                                  event
                                                    .target
                                                    .value,
                                              })
                                            )
                                          }
                                          placeholder="+rep"
                                          className="border border-white/10 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            verifyReport(
                                              quest,
                                              report.uid ||
                                                ""
                                            )
                                          }
                                          className="border border-green-700/40 px-4 py-2 text-[10px] tracking-[0.24em] text-green-300"
                                        >
                                          VERIFY
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRejectReport(
                                              quest,
                                              report.uid ||
                                                ""
                                            )
                                          }
                                          className="border border-red-700/40 px-4 py-2 text-[10px] tracking-[0.24em] text-red-300"
                                        >
                                          REJECT
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  {Array.isArray(
                    quest.applicants
                  ) &&
                    quest.applicants.length >
                      0 && (
                      <div className="mt-4 border border-white/10 bg-black/20 p-4">
                        <p className="text-[10px] tracking-[0.28em] text-yellow-700">
                          APPLICANT REVIEW
                        </p>
                        <div className="mt-3 grid gap-3">
                          {quest.applicants.map(
                            (
                              applicant: any
                            ) => {
                              const accepted =
                                quest.acceptedApplicantUids?.includes(
                                  applicant.uid
                                );
                              const rejected =
                                quest.rejectedApplicantUids?.includes(
                                  applicant.uid
                                );

                              return (
                                <div
                                  key={
                                    applicant.uid
                                  }
                                  className="flex flex-col gap-3 border border-white/10 p-3 md:flex-row md:items-center md:justify-between"
                                >
                                  <div>
                                    <p className="text-sm text-zinc-100">
                                      {applicant.name ||
                                        "Unknown"}{" "}
                                      |{" "}
                                      {applicant.rank ||
                                        "F-RANK"}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                      {applicant.email ||
                                        "No email"}
                                    </p>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                      type="button"
                                      disabled={
                                        accepted ||
                                        rejected
                                      }
                                      onClick={() =>
                                        handleAcceptApplicant(
                                          quest,
                                          applicant
                                        )
                                      }
                                      className="border border-green-700/40 px-4 py-2 text-[10px] tracking-[0.24em] text-green-300 disabled:opacity-40"
                                    >
                                      {accepted
                                        ? "ACCEPTED"
                                        : "ACCEPT"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={
                                        accepted ||
                                        rejected
                                      }
                                      onClick={() =>
                                        handleRejectApplicant(
                                          quest,
                                          applicant
                                        )
                                      }
                                      className="border border-red-700/40 px-4 py-2 text-[10px] tracking-[0.24em] text-red-300 disabled:opacity-40"
                                    >
                                      {rejected
                                        ? "REJECTED"
                                        : "REJECT"}
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input
                      value={
                        editingQuest[quest.id]?.title ??
                        quest.title ??
                        ""
                      }
                      onChange={(event) =>
                        setEditingQuest((current) => ({
                          ...current,
                          [quest.id]: {
                            ...current[quest.id],
                            title:
                              event.target.value,
                          },
                        }))
                      }
                      placeholder="Quest title"
                      className="border border-white/10 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <input
                      value={
                        editingQuest[quest.id]?.reward ??
                        quest.reward ??
                        ""
                      }
                      onChange={(event) =>
                        setEditingQuest((current) => ({
                          ...current,
                          [quest.id]: {
                            ...current[quest.id],
                            reward:
                              event.target.value,
                          },
                        }))
                      }
                      placeholder="Reward"
                      className="border border-white/10 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <select
                      value={
                        editingQuest[quest.id]
                          ?.difficulty ??
                        quest.difficulty ??
                        "E-RANK"
                      }
                      onChange={(event) =>
                        setEditingQuest((current) => ({
                          ...current,
                          [quest.id]: {
                            ...current[quest.id],
                            difficulty:
                              event.target.value,
                          },
                        }))
                      }
                      className="border border-white/10 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
                    >
                      {[
                        "E-RANK",
                        "D-RANK",
                        "C-RANK",
                        "B-RANK",
                        "A-RANK",
                        "S-RANK",
                      ].map((rank) => (
                        <option key={rank} value={rank}>
                          {rank}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={
                        editingQuest[quest.id]
                          ?.maxApplicants ??
                        quest.maxApplicants ??
                        1
                      }
                      onChange={(event) =>
                        setEditingQuest((current) => ({
                          ...current,
                          [quest.id]: {
                            ...current[quest.id],
                            maxApplicants: Number(
                              event.target.value
                            ),
                          },
                        }))
                      }
                      className="border border-white/10 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <input
                      value={
                        editingQuest[quest.id]?.questType ??
                        quest.questType ??
                        ""
                      }
                      onChange={(event) =>
                        setEditingQuest((current) => ({
                          ...current,
                          [quest.id]: {
                            ...current[quest.id],
                            questType:
                              event.target.value,
                          },
                        }))
                      }
                      placeholder="Type"
                      className="border border-white/10 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <input
                      value={
                        editingQuest[quest.id]?.deadline ??
                        quest.deadline ??
                        ""
                      }
                      onChange={(event) =>
                        setEditingQuest((current) => ({
                          ...current,
                          [quest.id]: {
                            ...current[quest.id],
                            deadline:
                              event.target.value,
                          },
                        }))
                      }
                      placeholder="Deadline"
                      className="border border-white/10 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <input
                      value={
                        editingQuest[quest.id]?.location ??
                        quest.location ??
                        ""
                      }
                      onChange={(event) =>
                        setEditingQuest((current) => ({
                          ...current,
                          [quest.id]: {
                            ...current[quest.id],
                            location:
                              event.target.value,
                          },
                        }))
                      }
                      placeholder="Location"
                      className="border border-white/10 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        saveQuestEdits(quest)
                      }
                      className="border border-yellow-700/40 px-4 py-3 text-[10px] tracking-[0.25em] text-yellow-300"
                    >
                      SAVE EDITS
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:w-[440px]">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuest(quest.id, {
                        verified:
                          !quest.verified,
                        status: quest.verified
                          ? "pending_review"
                          : "open",
                      })
                    }
                    className="border border-yellow-700/40 px-4 py-3 text-[10px] tracking-[0.25em] text-yellow-300"
                  >
                    {quest.verified
                      ? "UNVERIFY"
                      : "VERIFY"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuest(quest.id, {
                        status:
                          String(
                            quest.status || ""
                          ).toLowerCase() ===
                          "open"
                            ? "closed"
                            : "open",
                      })
                    }
                    className="border border-white/10 px-4 py-3 text-[10px] tracking-[0.25em] text-zinc-300"
                  >
                    {String(
                      quest.status || ""
                    ).toLowerCase() === "open"
                      ? "CLOSE"
                      : "REOPEN"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuest(quest.id, {
                        featured:
                          !quest.featured,
                      })
                    }
                    className="border border-white/10 px-4 py-3 text-[10px] tracking-[0.25em] text-zinc-300"
                  >
                    {quest.featured
                      ? "UNFEATURE"
                      : "FEATURE"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="border border-yellow-900/20 bg-black/35 p-4 sm:p-6 backdrop-blur-xl">
        <p className="text-[10px] tracking-[0.45em] text-yellow-700">
          OPERATIONS BULLETIN
        </p>
        <h2 className="font-cinzel mt-3 text-2xl sm:text-3xl text-yellow-400">
          Tech Announcements
        </h2>

        <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="border border-white/10 bg-black/25 p-4 sm:p-5">
            <input
              type="text"
              value={announcementTitle}
              onChange={(event) =>
                setAnnouncementTitle(
                  event.target.value
                )
              }
              placeholder="Ops bulletin title"
              className="w-full border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
            />
            <textarea
              value={announcementBody}
              onChange={(event) =>
                setAnnouncementBody(
                  event.target.value
                )
              }
              placeholder="Share downtime, quest board maintenance, or release notes..."
              className="mt-4 h-32 w-full resize-none border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
            />
            <button
              type="button"
              onClick={handleOpsAnnouncement}
              className="mt-4 w-full border border-yellow-700/40 bg-yellow-500/10 px-4 py-3 text-[10px] tracking-[0.3em] text-yellow-300"
            >
              POST OPS NOTE
            </button>
          </div>

          <div className="grid gap-4">
            {announcements.map(
              (announcement) => (
                <article
                  key={announcement.id}
                  className="border border-white/10 bg-black/25 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] tracking-[0.28em] text-yellow-700">
                        {announcement.type.toUpperCase()}{" "}
                        |{" "}
                        {announcement.active
                          ? "LIVE"
                          : "HIDDEN"}
                      </p>
                      <h3 className="font-cinzel mt-3 text-2xl text-zinc-100">
                        {announcement.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateAnnouncement(
                          announcement.id,
                          {
                            active:
                              !announcement.active,
                          }
                        ).then(
                          loadTechData
                        )
                      }
                      className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] text-zinc-300"
                    >
                      {announcement.active
                        ? "HIDE"
                        : "RESTORE"}
                    </button>
                  </div>
                  <p className="mt-4 text-zinc-400">
                    {announcement.body}
                  </p>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      <AdventurerProfileLookup
        title="Tech Profile Search"
        allowEditing
      />
    </div>
  );
}

function ConsoleStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-yellow-900/20 bg-black/35 p-5 backdrop-blur-xl">
      <p className="text-[10px] tracking-[0.35em] text-yellow-700">
        {label}
      </p>
      <p className="font-cinzel mt-3 text-4xl text-yellow-400">
        {value}
      </p>
    </div>
  );
}

function AttentionBadge({
  label,
}: {
  label: string;
}) {
  return (
    <span className="border border-yellow-700/40 bg-yellow-500/10 px-2 py-1 text-[9px] tracking-[0.18em] text-yellow-300">
      {label}
    </span>
  );
}
