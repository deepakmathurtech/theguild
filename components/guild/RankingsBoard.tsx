"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type Adventurer = {
  uid: string;
  adventurerId?: string;
  name: string;
  guildRank?: string;
  reputation?: number;
  questsCompleted?: number;
  specialization?: string;
  approved?: boolean;
};

export default function RankingsBoard() {
  const [adventurers, setAdventurers] =
    useState<Adventurer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadRankings() {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "adventurers")
        );

        const loaded =
          snapshot.docs
            .map((docSnap) => {
              const data =
                docSnap.data() as Adventurer;

              return {
                ...data,
                uid: docSnap.id,
              };
            })
            .sort(
              (first, second) =>
                (second.reputation || 0) -
                (first.reputation || 0)
            );

        setAdventurers(loaded);
      } catch (rankingError) {
        console.log(rankingError);
        setError(
          "Unable to load rankings right now."
        );
      } finally {
        setLoading(false);
      }
    }

    loadRankings();
  }, []);

  if (loading) {
    return (
      <p className="mt-12 text-center text-[10px] tracking-[0.4em] text-yellow-500">
        LOADING RANKINGS...
      </p>
    );
  }

  if (error) {
    return (
      <div className="mt-12 border border-red-900/30 bg-red-950/20 p-6 text-center text-red-200">
        {error}
      </div>
    );
  }

  if (!adventurers.length) {
    return (
      <div className="mt-12 border border-yellow-900/20 bg-black/35 p-8 text-center backdrop-blur-xl">
        <h2 className="font-cinzel text-3xl text-yellow-400">
          No Adventurers Yet
        </h2>
        <p className="mt-4 text-xl italic text-zinc-400">
          Be the first name recorded in the guild archives.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex border border-yellow-700/40 bg-yellow-500/10 px-5 py-3 text-[10px] tracking-[0.3em] text-yellow-300"
        >
          JOIN GUILD
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-4">
      {adventurers.map(
        (adventurer, index) => (
          <article
            key={adventurer.uid}
            className="
              grid
              gap-4
              border
              border-yellow-900/20
              bg-black/35
              p-5
              backdrop-blur-xl
              md:grid-cols-[80px_1fr_auto]
              md:items-center
            "
          >
            <div className="font-cinzel text-4xl text-yellow-500">
              #{index + 1}
            </div>

            <div>
              <h2 className="font-cinzel text-2xl text-zinc-100">
                {adventurer.adventurerId ? (
                  <Link
                    href={`/${adventurer.adventurerId}`}
                    className="hover:text-yellow-300"
                  >
                    {adventurer.name ||
                      "Unknown Adventurer"}
                  </Link>
                ) : (
                  adventurer.name ||
                  "Unknown Adventurer"
                )}
              </h2>
              <p className="mt-2 text-sm italic text-zinc-500">
                {adventurer.specialization ||
                  "Generalist"}{" "}
                |{" "}
                {adventurer.approved
                  ? "Approved"
                  : "Pending approval"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-right md:min-w-64">
              <Stat
                label="RANK"
                value={
                  adventurer.guildRank ||
                  "F-RANK"
                }
              />
              <Stat
                label="REP"
                value={String(
                  adventurer.reputation || 0
                )}
              />
              <Stat
                label="QUESTS"
                value={String(
                  adventurer.questsCompleted ||
                    0
                )}
              />
              <Stat
                label="STATUS"
                value={
                  adventurer.approved
                    ? "READY"
                    : "PENDING"
                }
              />
            </div>
          </article>
        )
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[9px] tracking-[0.28em] text-yellow-700">
        {label}
      </p>
      <p className="mt-1 text-lg text-zinc-100">
        {value}
      </p>
    </div>
  );
}
