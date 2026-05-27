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
import type { GuildRole } from "@/lib/guildAccess";
import {
  pendingApplicantCount,
  pendingReportCount,
  prioritySort,
  questMatchesFilter,
  questMatchesSearch,
  questQueueStats,
  type QuestQueueFilter,
} from "@/lib/operationsQueue";
import { upsertPublicAdventurerProfile } from "@/lib/publicAdventurerProfile";
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

type AdminAdventurer = {
  uid: string;
  adventurerId?: string;
  name?: string;
  email?: string;
  guildRank?: string;
  reputation?: number;
  questsCompleted?: number;
  specialization?: string;
  cityName?: string;
  publicTagline?: string;
  portfolioUrl?: string;
  skillsVerified?: string[];
  approved?: boolean;
  role?: GuildRole;
};

type AdminQuest = {
  id: string;
  title?: string;
  status?: string;
  verified?: boolean;
  reward?: string;
  difficulty?: string;
  questType?: string;
  maxApplicants?: number;
  deadline?: string;
  location?: string;
  reportSubmitted?: boolean;
  reportSubmittedBy?: string;
  reportSubmittedByName?: string;
  reportText?: string;
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
  creatorName?: string;
  featured?: boolean;
};

const assignableRoles: GuildRole[] = [
  "adventurer",
  "tech",
  "admin",
];

const guildRanks = [
  "E-RANK",
  "D-RANK",
  "C-RANK",
  "B-RANK",
  "A-RANK",
  "S-RANK",
];

type AdventurerReviewFilter =
  | "all"
  | "pending"
  | "approved";

export default function AdminDashboard() {
  const [adventurers, setAdventurers] =
    useState<AdminAdventurer[]>([]);
  const [quests, setQuests] =
    useState<AdminQuest[]>([]);
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
  const [announcementType, setAnnouncementType] =
    useState<"general" | "ops" | "event">(
      "general"
    );
  const [announcementPinned, setAnnouncementPinned] =
    useState(true);
  const [reportReputation, setReportReputation] =
    useState<Record<string, string>>({});
  const [
    adventurerReviewFilter,
    setAdventurerReviewFilter,
  ] = useState<AdventurerReviewFilter>(
    "pending"
  );
  const [
    adventurerCityFilter,
    setAdventurerCityFilter,
  ] = useState("all");
  const [
    adventurerSearch,
    setAdventurerSearch,
  ] = useState("");
  const [questQueueFilter, setQuestQueueFilter] =
    useState<QuestQueueFilter>(
      "attention"
    );
  const [questSearch, setQuestSearch] =
    useState("");
  const [refreshedAt, setRefreshedAt] =
    useState<Date | null>(null);

  async function loadAdminData() {
    setLoading(true);
    setMessage("");

    try {
      const [
        adventurerSnapshot,
        questSnapshot,
        loadedAnnouncements,
      ] = await Promise.all([
        getDocs(
          collection(db, "adventurers")
        ),
        getDocs(
          collection(db, "questsv1")
        ),
        loadAnnouncements(),
      ]);

      setAdventurers(
        adventurerSnapshot.docs.map(
          (docSnap) => ({
            ...(docSnap.data() as AdminAdventurer),
            uid: docSnap.id,
          })
        )
      );

      setQuests(
        questSnapshot.docs.map(
          (docSnap) => ({
            ...(docSnap.data() as AdminQuest),
            id: docSnap.id,
          })
        )
      );

      setAnnouncements(
        loadedAnnouncements
      );
      setRefreshedAt(new Date());
    } catch (error) {
      console.log(error);
      setMessage(
        "Unable to load admin data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(
      loadAdminData,
      0
    );

    return () =>
      window.clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const queue = questQueueStats(quests);

    return {
      pendingAdventurers:
        adventurers.filter(
          (adventurer) =>
            !adventurer.approved
        ).length,
      approvedAdventurers:
        adventurers.filter(
          (adventurer) =>
            adventurer.approved
        ).length,
      liveAnnouncements:
        announcements.filter(
          (announcement) =>
            announcement.active
        ).length,
      queue,
    };
  }, [
    adventurers,
    announcements,
    quests,
  ]);

  const adventurerCities = useMemo(
    () =>
      Array.from(
        new Set(
          adventurers
            .map((adventurer) =>
              String(
                adventurer.cityName || ""
              ).trim()
            )
            .filter(Boolean)
        )
      ).sort((first, second) =>
        first.localeCompare(second)
      ),
    [adventurers]
  );

  const visibleAdventurers = useMemo(
    () =>
      adventurers.filter(
        (adventurer) => {
          const matchesReview =
            adventurerReviewFilter ===
              "all" ||
            (adventurerReviewFilter ===
              "approved"
              ? Boolean(
                  adventurer.approved
                )
              : !adventurer.approved);
          const matchesCity =
            adventurerCityFilter ===
              "all" ||
            adventurer.cityName ===
              adventurerCityFilter;
          const query =
            adventurerSearch
              .trim()
              .toLowerCase();
          const matchesSearch =
            !query ||
            [
              adventurer.name,
              adventurer.email,
              adventurer.adventurerId,
              adventurer.specialization,
              adventurer.cityName,
            ].some((value) =>
              String(value || "")
                .toLowerCase()
                .includes(query)
            );

          return (
            matchesReview &&
            matchesCity &&
            matchesSearch
          );
        }
      ),
    [
      adventurers,
      adventurerCityFilter,
      adventurerReviewFilter,
      adventurerSearch,
    ]
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
            )
        )
      ),
    [
      quests,
      questQueueFilter,
      questSearch,
    ]
  );

  async function updateAdventurer(
    uid: string,
    data: Partial<AdminAdventurer>
  ) {
    await updateDoc(
      doc(db, "adventurers", uid),
      {
        ...data,
        updatedAt: serverTimestamp(),
      }
    );

    const existing =
      adventurers.find(
        (adventurer) =>
          adventurer.uid === uid
      );

    if (existing) {
      await upsertPublicAdventurerProfile(
        db,
        uid,
        {
          uid,
          adventurerId:
            (existing as AdminAdventurer & {
              adventurerId?: string;
            }).adventurerId,
          name: existing.name,
          guildRank:
            data.guildRank ||
            existing.guildRank,
          specialization:
            existing.specialization,
          cityName:
            (existing as AdminAdventurer & {
              cityName?: string;
            }).cityName,
          publicTagline:
            (existing as AdminAdventurer & {
              publicTagline?: string;
            }).publicTagline,
          skillsVerified:
            (existing as AdminAdventurer & {
              skillsVerified?: string[];
            }).skillsVerified,
          portfolioUrl:
            (existing as AdminAdventurer & {
              portfolioUrl?: string;
            }).portfolioUrl,
          questsCompleted:
            data.questsCompleted ??
            existing.questsCompleted,
          reputation:
            data.reputation ??
            existing.reputation,
          approved:
            data.approved ??
            existing.approved,
        }
      );
    }

    await loadAdminData();
  }

  async function updateQuest(
    id: string,
    data: Partial<AdminQuest>
  ) {
    await updateDoc(
      doc(db, "questsv1", id),
      {
        ...data,
        updatedAt: serverTimestamp(),
      }
    );

    await loadAdminData();
  }

  async function handleAcceptApplicant(
    quest: AdminQuest,
    applicant: any
  ) {
    try {
      setMessage("");
      await acceptQuestApplicant(
        db,
        quest.id,
        applicant
      );
      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Unable to accept applicant."
      );
    }
  }

  async function handleRejectApplicant(
    quest: AdminQuest,
    applicant: any
  ) {
    try {
      setMessage("");
      await rejectQuestApplicant(
        db,
        quest.id,
        applicant
      );
      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Unable to reject applicant."
      );
    }
  }

  async function handleVerifyReport(
    quest: AdminQuest,
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
      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Unable to verify report."
      );
    }
  }

  async function handleRejectReport(
    quest: AdminQuest,
    reportUid: string
  ) {
    try {
      await rejectQuestReport(
        db,
        quest,
        reportUid
      );
      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Unable to reject report."
      );
    }
  }

  async function handleAnnouncementSubmit() {
    if (
      !announcementTitle.trim() ||
      !announcementBody.trim()
    ) {
      setMessage(
        "Announcement title and body are required."
      );
      return;
    }

    await createAnnouncement({
      title:
        announcementTitle.trim(),
      body: announcementBody.trim(),
      type: announcementType,
      pinned: announcementPinned,
      active: true,
      author:
        "Central Guild Command",
      role: "owner",
    });

    setAnnouncementTitle("");
    setAnnouncementBody("");
    setAnnouncementPinned(true);
    await loadAdminData();
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="PENDING"
          value={String(
            stats.pendingAdventurers
          )}
        />
        <StatCard
          label="APPROVED"
          value={String(
            stats.approvedAdventurers
          )}
        />
        <StatCard
          label="NEEDS ATTENTION"
          value={String(stats.queue.attention)}
        />
        <StatCard
          label="QUEST VERIFICATION"
          value={String(
            stats.queue.verification
          )}
        />
        <StatCard
          label="REPORTS WAITING"
          value={String(
            stats.queue.reports
          )}
        />
        <StatCard
          label="APPLICANTS WAITING"
          value={String(
            stats.queue.applicants
          )}
        />
        <StatCard
          label="LIVE NOTES"
          value={String(
            stats.liveAnnouncements
          )}
        />
      </div>

      {message && (
        <div className="border border-red-900/30 bg-red-950/20 p-5 text-red-200">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-[10px] tracking-[0.4em] text-yellow-500">
          LOADING ADMIN LEDGER...
        </p>
      ) : (
        <>
          <section className="border border-yellow-900/20 bg-black/35 p-4 sm:p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] tracking-[0.45em] text-yellow-700">
                  ADVENTURER CONTROL
                </p>
                <h2 className="font-cinzel mt-3 text-2xl sm:text-3xl text-yellow-400">
                  Approvals, Roles, Progress
                </h2>
              </div>
              <button
                type="button"
                onClick={loadAdminData}
                className="border border-yellow-700/40 px-5 py-3 text-[10px] tracking-[0.3em] text-yellow-300"
              >
                REFRESH
              </button>
            </div>

            <div className="mt-6 grid gap-3 border border-white/10 bg-black/20 p-4 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_auto] xl:items-end">
              <div>
                <label htmlFor="admin-adventurer-search" className="mb-2 block text-[10px] tracking-[0.24em] text-yellow-700">
                  SEARCH RECORDS
                </label>
                <input
                  id="admin-adventurer-search"
                  type="search"
                  value={adventurerSearch}
                  onChange={(event) =>
                    setAdventurerSearch(
                      event.target.value
                    )
                  }
                  placeholder="Name, email, Guild ID, city"
                  className="min-h-12 w-full border border-white/10 bg-black px-4 py-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label htmlFor="admin-review-filter" className="mb-2 block text-[10px] tracking-[0.24em] text-yellow-700">
                  REVIEW STATUS
                </label>
                <select
                  id="admin-review-filter"
                  value={adventurerReviewFilter}
                  onChange={(event) =>
                    setAdventurerReviewFilter(
                      event.target
                        .value as AdventurerReviewFilter
                    )
                  }
                  className="min-h-12 w-full border border-white/10 bg-black px-4 py-3 text-sm text-zinc-200"
                >
                  <option value="pending">
                    Unapproved / Pending
                  </option>
                  <option value="approved">
                    Approved
                  </option>
                  <option value="all">
                    All applications
                  </option>
                </select>
              </div>
              <div>
                <label htmlFor="admin-city-filter" className="mb-2 block text-[10px] tracking-[0.24em] text-yellow-700">
                  CITY
                </label>
                <select
                  id="admin-city-filter"
                  value={adventurerCityFilter}
                  onChange={(event) =>
                    setAdventurerCityFilter(
                      event.target.value
                    )
                  }
                  className="min-h-12 w-full border border-white/10 bg-black px-4 py-3 text-sm text-zinc-200"
                >
                  <option value="all">
                    All cities
                  </option>
                  {adventurerCities.map(
                    (city) => (
                      <option
                        key={city}
                        value={city}
                      >
                        {city}
                      </option>
                    )
                  )}
                </select>
              </div>
              <p className="pb-3 text-[10px] tracking-[0.22em] text-zinc-400">
                {visibleAdventurers.length}{" "}
                RECORDS
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              {visibleAdventurers.length ===
                0 && (
                <p className="border border-white/10 bg-black/25 p-5 text-sm text-zinc-400">
                  No adventurer applications match these filters.
                </p>
              )}
              {visibleAdventurers.map(
                (adventurer) => (
                  <article
                    key={adventurer.uid}
                    className="grid gap-5 border border-white/10 bg-black/25 p-4 sm:p-5 xl:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <h3 className="font-cinzel text-xl sm:text-2xl text-zinc-100">
                        {adventurer.name ||
                          "Unnamed"}
                      </h3>
                      <p className="mt-2 text-sm text-zinc-500">
                        {adventurer.email ||
                          "No email"}{" "}
                        |{" "}
                        {adventurer.adventurerId ||
                          "No ID assigned"}{" "}
                        |{" "}
                        {adventurer.specialization ||
                          "No specialization"}
                        {" "} |{" "}
                        {adventurer.cityName ||
                          "No city"}
                      </p>
                      <p className="mt-3 text-[10px] tracking-[0.28em] text-yellow-700">
                        {adventurer.approved
                          ? "APPROVED"
                          : "PENDING"}{" "}
                        |{" "}
                        {adventurer.guildRank ||
                          "F-RANK"}{" "}
                        | ROLE{" "}
                        {adventurer.role ||
                          "adventurer"}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-[540px] xl:grid-cols-4">
                      <button
                        type="button"
                        onClick={() =>
                          updateAdventurer(
                            adventurer.uid,
                            {
                              approved:
                                !adventurer.approved,
                            }
                          )
                        }
                        className="border border-yellow-700/40 px-4 py-3 text-[10px] tracking-[0.25em] text-yellow-300"
                      >
                        {adventurer.approved
                          ? "MARK PENDING"
                          : "APPROVE"}
                      </button>

                      <select
                        value={
                          adventurer.role ||
                          "adventurer"
                        }
                        onChange={(event) =>
                          updateAdventurer(
                            adventurer.uid,
                            {
                              role: event.target
                                .value as GuildRole,
                            }
                          )
                        }
                        className="border border-white/10 bg-black px-4 py-3 text-sm text-zinc-200"
                      >
                        {assignableRoles.map(
                          (role) => (
                            <option
                              key={role}
                              value={role}
                            >
                              {role.toUpperCase()}
                            </option>
                          )
                        )}
                      </select>

                      <select
                        value={
                          adventurer.guildRank ||
                          "E-RANK"
                        }
                        onChange={(event) =>
                          updateAdventurer(
                            adventurer.uid,
                            {
                              guildRank:
                                event.target
                                  .value,
                            }
                          )
                        }
                        className="border border-white/10 bg-black px-4 py-3 text-sm text-zinc-200"
                      >
                        {guildRanks.map(
                          (rank) => (
                            <option
                              key={rank}
                              value={rank}
                            >
                              {rank}
                            </option>
                          )
                        )}
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateAdventurer(
                              adventurer.uid,
                              {
                                reputation:
                                  (adventurer.reputation ||
                                    0) + 10,
                              }
                            )
                          }
                          className="border border-white/10 px-3 py-3 text-[10px] tracking-[0.2em] text-zinc-300"
                        >
                          REP +10
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateAdventurer(
                              adventurer.uid,
                              {
                                questsCompleted:
                                  (adventurer.questsCompleted ||
                                    0) + 1,
                              }
                            )
                          }
                          className="border border-white/10 px-3 py-3 text-[10px] tracking-[0.2em] text-zinc-300"
                        >
                          QUEST +1
                        </button>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>

          <section className="border border-yellow-900/20 bg-black/35 p-4 sm:p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] tracking-[0.45em] text-yellow-700">
                  QUEST CONTROL
                </p>
                <h2 className="font-cinzel mt-3 text-2xl sm:text-3xl text-yellow-400">
                  Verification, Visibility, Status
                </h2>
              </div>
              {refreshedAt && (
                <p className="text-[10px] tracking-[0.2em] text-zinc-500">
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

            <div className="mt-6 grid gap-3 border border-white/10 bg-black/20 p-4 xl:grid-cols-[1.2fr_1fr_auto] xl:items-end">
              <div>
                <label htmlFor="admin-quest-search" className="mb-2 block text-[10px] tracking-[0.24em] text-yellow-700">
                  SEARCH QUESTS
                </label>
                <input
                  id="admin-quest-search"
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
                <label htmlFor="admin-quest-queue" className="mb-2 block text-[10px] tracking-[0.24em] text-yellow-700">
                  WORK QUEUE
                </label>
                <select
                  id="admin-quest-queue"
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
              <p className="pb-3 text-[10px] tracking-[0.22em] text-zinc-400">
                {visibleQuests.length} QUESTS
              </p>
            </div>

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
                      STATUS{" "}
                      {quest.status || "open"} |{" "}
                      {quest.verified
                        ? "VERIFIED"
                        : "UNVERIFIED"}{" "}
                      |{" "}
                      {quest.featured
                        ? "FEATURED"
                        : "STANDARD"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!quest.verified && (
                        <QueueBadge label="VERIFY QUEST" />
                      )}
                      {pendingReportCount(quest) >
                        0 && (
                        <QueueBadge
                          label={`${pendingReportCount(
                            quest
                          )} REPORTS`}
                        />
                      )}
                      {pendingApplicantCount(
                        quest
                      ) > 0 && (
                        <QueueBadge
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
                                              handleVerifyReport(
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
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-[520px] xl:grid-cols-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuest(quest.id, {
                          verified:
                            !quest.verified,
                          status:
                            quest.verified
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
          </section>

          <section className="border border-yellow-900/20 bg-black/35 p-4 sm:p-6 backdrop-blur-xl">
            <p className="text-[10px] tracking-[0.45em] text-yellow-700">
              BROADCAST CONTROL
            </p>
            <h2 className="font-cinzel mt-3 text-2xl sm:text-3xl text-yellow-400">
              Guild Announcements
            </h2>

            <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
              <div className="border border-white/10 bg-black/25 p-4 sm:p-5">
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(event) =>
                    setAnnouncementTitle(
                      event.target.value
                    )
                  }
                  placeholder="Announcement title"
                  className="w-full border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
                />
                <textarea
                  value={announcementBody}
                  onChange={(event) =>
                    setAnnouncementBody(
                      event.target.value
                    )
                  }
                  placeholder="Write the notice for the Tavern and staff boards..."
                  className="mt-4 h-40 w-full resize-none border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
                />
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <select
                    value={announcementType}
                    onChange={(event) =>
                      setAnnouncementType(
                        event.target.value as "general" | "ops" | "event"
                      )
                    }
                    className="border border-white/10 bg-black px-4 py-3 text-zinc-200"
                  >
                    <option value="general">
                      GENERAL
                    </option>
                    <option value="ops">
                      OPS
                    </option>
                    <option value="event">
                      EVENT
                    </option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setAnnouncementPinned(
                        !announcementPinned
                      )
                    }
                    className="border border-white/10 px-4 py-3 text-[10px] tracking-[0.25em] text-zinc-300"
                  >
                    {announcementPinned
                      ? "PINNED"
                      : "NOT PINNED"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAnnouncementSubmit}
                  className="mt-4 w-full border border-yellow-700/40 bg-yellow-500/10 px-4 py-3 text-[10px] tracking-[0.3em] text-yellow-300"
                >
                  PUBLISH ANNOUNCEMENT
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
                            {announcement.pinned
                              ? "PINNED"
                              : "STANDARD"}{" "}
                            |{" "}
                            {announcement.active
                              ? "LIVE"
                              : "HIDDEN"}
                          </p>
                          <h3 className="font-cinzel mt-3 text-2xl text-zinc-100">
                            {announcement.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
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
                                loadAdminData
                              )
                            }
                            className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] text-zinc-300"
                          >
                            {announcement.active
                              ? "HIDE"
                              : "RESTORE"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateAnnouncement(
                                announcement.id,
                                {
                                  pinned:
                                    !announcement.pinned,
                                }
                              ).then(
                                loadAdminData
                              )
                            }
                            className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] text-zinc-300"
                          >
                            {announcement.pinned
                              ? "UNPIN"
                              : "PIN"}
                          </button>
                        </div>
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
            title="Admin Profile Search"
            allowEditing
          />
        </>
      )}
    </div>
  );
}

function StatCard({
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

function QueueBadge({
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
