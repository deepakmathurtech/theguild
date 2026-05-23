"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Image from "next/image";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  limit,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import AmbientGlow from "@/components/guild/AmbientGlow";
import BackgroundEmblem from "@/components/guild/BackgroundEmblem";
import GuildNavbar from "@/components/guild/GuildNavbar";
import ProtectedRoute from "@/components/guild/ProtectedRoute";
import {
  loadActiveAnnouncements,
  type GuildAnnouncement,
} from "@/components/guild/guildAnnouncements";

import {
  useGuildAuth,
} from "@/components/guild/GuildAuthLogic";

type TavernMessage = {
  id: string;
  author: string;
  rank: string;
  message: string;
  uid: string;
  createdAt?: Timestamp;
};

export default function TavernPage() {
  const {
    guildProfile,
  } = useGuildAuth();

  const [message, setMessage] =
    useState("");
  const [messages, setMessages] =
    useState<TavernMessage[]>([]);
  const [announcements, setAnnouncements] =
    useState<GuildAnnouncement[]>([]);
  const [sending, setSending] =
    useState(false);
  const [searchQuery, setSearchQuery] =
    useState("");
  const [filter, setFilter] =
    useState<"all" | "mine">("all");

  const chatContainerRef =
    useRef<HTMLDivElement>(null);
  const shouldAutoScroll =
    useRef(true);
  const initialScrollDone =
    useRef(false);

  const deferredSearch =
    useDeferredValue(searchQuery);

  useEffect(() => {
    const chatQuery = query(
      collection(db, "tavernChat"),
      orderBy("createdAt", "asc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      chatQuery,
      (snapshot) => {
        const loaded =
          snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Omit<
              TavernMessage,
              "id"
            >),
            id: docSnap.id,
          }));

        setMessages(loaded);

        window.setTimeout(() => {
          const container =
            chatContainerRef.current;

          if (!container) {
            return;
          }

          if (!initialScrollDone.current) {
            container.scrollTop =
              container.scrollHeight;
            initialScrollDone.current =
              true;
            return;
          }

          if (
            shouldAutoScroll.current
          ) {
            container.scrollTo({
              top:
                container.scrollHeight,
              behavior: "smooth",
            });
          }
        }, 50);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        loadActiveAnnouncements()
          .then(setAnnouncements)
          .catch((error) => {
            console.log(error);
          });
      },
      0
    );

    return () =>
      window.clearTimeout(timer);
  }, []);

  const filteredMessages =
    useMemo(() => {
      const normalizedSearch =
        deferredSearch
          .trim()
          .toLowerCase();

      return messages.filter(
        (entry) => {
          const matchesFilter =
            filter === "all" ||
            entry.uid ===
              guildProfile?.uid;

          const matchesSearch =
            !normalizedSearch ||
            [
              entry.author,
              entry.rank,
              entry.message,
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      deferredSearch,
      filter,
      guildProfile?.uid,
      messages,
    ]);

  const pinnedAnnouncements =
    announcements.filter(
      (announcement) =>
        announcement.pinned
    );

  function handleScroll() {
    const container =
      chatContainerRef.current;

    if (!container) {
      return;
    }

    shouldAutoScroll.current =
      container.scrollHeight -
        container.scrollTop -
        container.clientHeight <
      120;
  }

  async function sendMessage() {
    if (
      !message.trim() ||
      !guildProfile ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);
      shouldAutoScroll.current =
        true;

      await addDoc(
        collection(db, "tavernChat"),
        {
          author:
            guildProfile.name,
          rank:
            guildProfile.guildRank,
          message:
            message.trim(),
          uid: guildProfile.uid,
          time:
            serverTimestamp(),
          createdAt:
            serverTimestamp(),
        }
      );

      setMessage("");
    } catch (error) {
      console.log(error);
    } finally {
      setSending(false);
    }
  }

  return (
    <ProtectedRoute access="adventurer">
      <main
        className="
          relative
          flex
          min-h-dvh
          flex-col
          overflow-hidden
          bg-[#0d0905]
          text-white
        "
      >
        <AmbientGlow />
        <BackgroundEmblem />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-50">
          <GuildNavbar />
        </div>

        <section
          className="
            relative
            z-10
            flex
            flex-1
            justify-center
            px-2
            py-2
            sm:px-4
            sm:py-4
            lg:px-8
          "
        >
          <div
            className="
              grid
              min-h-[calc(100dvh-82px)]
              w-full
              max-w-7xl
              overflow-hidden
              rounded-3xl
              border
              border-yellow-900/20
              bg-black/40
              backdrop-blur-xl
              lg:grid-cols-[320px_1fr]
            "
          >
            <aside
              className="
                border-b
                border-white/5
                bg-black/20
                lg:border-b-0
                lg:border-r
              "
            >
              <div className="border-b border-white/5 p-4 sm:p-6">
                <p className="text-[10px] tracking-[0.45em] text-yellow-700">
                  SOCIAL HALL
                </p>
                <h2 className="mt-4 text-3xl font-black text-yellow-400">
                  Tavern
                </h2>
                <p className="mt-3 text-sm text-zinc-500">
                  Rest, recruit, and keep an eye on guild notices.
                </p>
              </div>

              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                  <p className="text-[10px] tracking-[0.25em] text-zinc-500">
                    CURRENT ADVENTURER
                  </p>
                  <h3 className="mt-3 text-xl font-bold text-yellow-300 sm:text-2xl">
                    {guildProfile?.name ||
                      "Guest"}
                  </h3>
                  <p className="mt-2 text-xs tracking-[0.3em] text-yellow-700">
                    {guildProfile?.guildRank ||
                      "UNREGISTERED"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                  <p className="text-[10px] tracking-[0.25em] text-zinc-500">
                    TAVERN STATUS
                  </p>
                  <div className="mt-4 grid gap-3">
                    <StatusRow
                      label="MESSAGES"
                      value={String(
                        messages.length
                      )}
                    />
                    <StatusRow
                      label="PINNED NOTES"
                      value={String(
                        pinnedAnnouncements.length
                      )}
                    />
                    <StatusRow
                      label="VISIBLE"
                      value={String(
                        filteredMessages.length
                      )}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                  <p className="text-[10px] tracking-[0.25em] text-zinc-500">
                    ANNOUNCEMENTS
                  </p>
                  <div className="mt-4 space-y-3">
                    {announcements
                      .slice(0, 3)
                      .map((announcement) => (
                        <div
                          key={announcement.id}
                          className="border border-yellow-900/20 bg-black/25 p-3"
                        >
                          <p className="text-[9px] tracking-[0.25em] text-yellow-700">
                            {announcement.type.toUpperCase()}
                          </p>
                          <p className="mt-2 text-sm text-zinc-200">
                            {announcement.title}
                          </p>
                        </div>
                      ))}
                    {!announcements.length && (
                      <p className="text-sm text-zinc-500">
                        No guild notices posted yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex min-h-0 flex-col">
              <div className="border-b border-white/5 px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] tracking-[0.45em] text-yellow-700">
                      GLOBAL CHAT
                    </p>
                    <h1 className="mt-2 text-2xl font-black text-yellow-400 sm:text-3xl">
                      Guild Tavern
                    </h1>
                  </div>
                  <Image
                    src="/guild-logo.png"
                    alt="Guild"
                    width={42}
                    height={42}
                    className="opacity-70"
                  />
                </div>

                {pinnedAnnouncements.length > 0 && (
                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {pinnedAnnouncements
                      .slice(0, 2)
                      .map((announcement) => (
                        <div
                          key={announcement.id}
                          className="border border-yellow-700/30 bg-yellow-500/10 p-4"
                        >
                          <p className="text-[10px] tracking-[0.3em] text-yellow-700">
                            PINNED {announcement.type.toUpperCase()}
                          </p>
                          <h2 className="mt-2 text-lg text-yellow-200">
                            {announcement.title}
                          </h2>
                          <p className="mt-2 text-sm text-zinc-300">
                            {announcement.body}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3 xl:flex-row">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(
                        event.target.value
                      )
                    }
                    placeholder="Search the Tavern"
                    className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-yellow-700/40"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFilter("all")
                      }
                      className={`rounded-2xl border px-4 py-3 text-[10px] tracking-[0.28em] ${
                        filter === "all"
                          ? "border-yellow-700 bg-yellow-500/10 text-yellow-300"
                          : "border-white/10 text-zinc-400"
                      }`}
                    >
                      ALL
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFilter("mine")
                      }
                      className={`rounded-2xl border px-4 py-3 text-[10px] tracking-[0.28em] ${
                        filter === "mine"
                          ? "border-yellow-700 bg-yellow-500/10 text-yellow-300"
                          : "border-white/10 text-zinc-400"
                      }`}
                    >
                      MY POSTS
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3 py-5 sm:px-5 md:px-7"
              >
                <div className="space-y-4">
                  {filteredMessages.map(
                    (entry) => {
                      const isYou =
                        entry.uid ===
                        guildProfile?.uid;

                      return (
                        <div
                          key={entry.id}
                          className={`flex ${
                            isYou
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`flex max-w-[88%] gap-3 sm:max-w-[75%] ${
                              isYou
                                ? "flex-row-reverse"
                                : ""
                            }`}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-yellow-700/30 bg-yellow-500/10 text-sm font-black text-yellow-400">
                              {entry.author?.[0]}
                            </div>

                            <div
                              className={`rounded-3xl border px-4 py-3 ${
                                isYou
                                  ? "border-yellow-700/20 bg-yellow-500/10"
                                  : "border-white/5 bg-white/[0.03]"
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-yellow-300">
                                  {entry.author}
                                </p>
                                <span className="text-[9px] tracking-[0.25em] text-yellow-700">
                                  {entry.rank}
                                </span>
                              </div>

                              <p className="mt-2 break-words text-sm leading-relaxed text-zinc-300 sm:text-base">
                                {entry.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}

                  {!filteredMessages.length && (
                    <div className="border border-white/10 bg-black/25 p-6 text-center text-zinc-500">
                      No messages match the current Tavern filter.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 p-3 sm:p-5">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
                  <textarea
                    value={message}
                    onChange={(event) =>
                      setMessage(
                        event.target.value.slice(
                          0,
                          500
                        )
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Share a lead, ask for help, or gather a party..."
                    className="h-24 w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-zinc-500"
                  />
                  <div className="flex flex-col gap-3 border-t border-white/5 px-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10px] tracking-[0.25em] text-zinc-500">
                      SHIFT+ENTER for a new line
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] tracking-[0.25em] text-zinc-500">
                        {message.trim().length}
                        /500
                      </p>
                      <button
                        onClick={sendMessage}
                        disabled={
                          sending ||
                          !message.trim()
                        }
                        className="rounded-2xl border border-yellow-700 bg-yellow-500/10 px-5 py-3 text-[10px] font-black tracking-[0.3em] text-yellow-400 transition hover:bg-yellow-500 hover:text-black disabled:opacity-50"
                      >
                        {sending
                          ? "SENDING"
                          : "SEND"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">
        {label}
      </span>
      <span className="text-yellow-300">
        {value}
      </span>
    </div>
  );
}
