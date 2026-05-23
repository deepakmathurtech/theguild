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
import { upsertPublicAdventurerProfile } from "@/lib/publicAdventurerProfile";

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
  questType?: string;
  applicants?: unknown[];
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
      openQuests: quests.filter(
        (quest) =>
          String(
            quest.status || ""
          ).toLowerCase() === "open"
      ).length,
      featuredQuests:
        quests.filter(
          (quest) => quest.featured
        ).length,
      liveAnnouncements:
        announcements.filter(
          (announcement) =>
            announcement.active
        ).length,
    };
  }, [
    adventurers,
    announcements,
    quests,
  ]);

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
          label="OPEN QUESTS"
          value={String(stats.openQuests)}
        />
        <StatCard
          label="FEATURED"
          value={String(
            stats.featuredQuests
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

            <div className="mt-6 grid gap-4">
              {adventurers.map(
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
            <p className="text-[10px] tracking-[0.45em] text-yellow-700">
              QUEST CONTROL
            </p>
            <h2 className="font-cinzel mt-3 text-2xl sm:text-3xl text-yellow-400">
              Verification, Visibility, Status
            </h2>

            <div className="mt-6 grid gap-4">
              {quests.map((quest) => (
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
                      | Applicants{" "}
                      {quest.applicants?.length ||
                        0}
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
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-[440px] xl:grid-cols-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuest(quest.id, {
                          verified:
                            !quest.verified,
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
