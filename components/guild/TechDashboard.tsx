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
  createAnnouncement,
  loadAnnouncements,
  updateAnnouncement,
  type GuildAnnouncement,
} from "./guildAnnouncements";
import AdventurerProfileLookup from "./AdventurerProfileLookup";

type TechQuest = {
  id: string;
  title?: string;
  status?: string;
  verified?: boolean;
  reward?: string;
  questType?: string;
  applicants?: unknown[];
  reports?: number;
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
    return {
      total: quests.length,
      open: quests.filter(
        (quest) =>
          String(
            quest.status || ""
          ).toLowerCase() === "open"
      ).length,
      closed: quests.filter(
        (quest) =>
          String(
            quest.status || ""
          ).toLowerCase() === "closed"
      ).length,
      applied: quests.reduce(
        (total, quest) =>
          total +
          (quest.applicants?.length || 0),
        0
      ),
      featured: quests.filter(
        (quest) => quest.featured
      ).length,
    };
  }, [quests]);

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ConsoleStat
          label="TOTAL"
          value={String(stats.total)}
        />
        <ConsoleStat
          label="OPEN"
          value={String(stats.open)}
        />
        <ConsoleStat
          label="CLOSED"
          value={String(stats.closed)}
        />
        <ConsoleStat
          label="APPLICATIONS"
          value={String(stats.applied)}
        />
        <ConsoleStat
          label="FEATURED"
          value={String(stats.featured)}
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

        {loading ? (
          <p className="mt-8 text-[10px] tracking-[0.4em] text-yellow-500">
            LOADING QUESTS...
          </p>
        ) : (
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
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:w-[440px]">
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
