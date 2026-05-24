"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type PublicAdventurerProfileProps = {
  adventurerId: string;
};

type PublicProfile = {
  adventurerId?: string;
  name?: string;
  guildRank?: string;
  specialization?: string;
  cityName?: string;
  publicTagline?: string;
  skillsVerified?: string[];
  achievements?: string[];
  departments?: string[];
  portfolioUrl?: string;
  questsCompleted?: number;
  reputation?: number;
  approved?: boolean;
};

export default function PublicAdventurerProfile({
  adventurerId,
}: PublicAdventurerProfileProps) {
  const [profile, setProfile] =
    useState<PublicProfile | null>(
      null
    );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    const timer = window.setTimeout(
      async () => {
        try {
          const snapshot =
            await getDocs(
              query(
                collection(
                  db,
                  "publicAdventurerProfiles"
                ),
                where(
                  "adventurerId",
                  "==",
                  adventurerId
                )
              )
            );

          if (snapshot.empty) {
            setError(
              "No public guild profile exists for that ID."
            );
            return;
          }

          setProfile(
            snapshot.docs[0]
              .data() as PublicProfile
          );
        } catch (profileError) {
          console.log(profileError);
          setError(
            "Unable to load public profile."
          );
        } finally {
          setLoading(false);
        }
      },
      0
    );

    return () =>
      window.clearTimeout(timer);
  }, [adventurerId]);

  if (loading) {
    return (
      <p className="text-[10px] tracking-[0.4em] text-yellow-500">
        LOADING PUBLIC DOSSIER...
      </p>
    );
  }

  if (error || !profile) {
    return (
      <div className="border border-red-900/30 bg-red-950/20 p-6 text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="border border-yellow-900/20 bg-black/35 p-5 sm:p-8 backdrop-blur-xl">
        <p className="text-[10px] tracking-[0.45em] text-yellow-700">
          PUBLIC GUILD PROFILE
        </p>
        <h1 className="font-cinzel mt-4 break-words text-3xl text-yellow-400 sm:text-5xl">
          {profile.name}
        </h1>
        <p className="mt-3 text-base italic text-zinc-400 sm:text-lg">
          {profile.publicTagline ||
            "Verified guild adventurer profile."}
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <ProfileStat
            label="GUILD ID"
            value={
              profile.adventurerId
            }
          />
          <ProfileStat
            label="RANK"
            value={profile.guildRank}
          />
          <ProfileStat
            label="CITY"
            value={profile.cityName}
          />
          <ProfileStat
            label="SPECIALIZATION"
            value={
              profile.specialization
            }
          />
          <ProfileStat
            label="QUESTS COMPLETED"
            value={String(
              profile.questsCompleted || 0
            )}
          />
          <ProfileStat
            label="REPUTATION"
            value={String(
              profile.reputation || 0
            )}
          />
        </div>
      </section>

      <section className="border border-yellow-900/20 bg-black/35 p-5 sm:p-8 backdrop-blur-xl">
        <p className="text-[10px] tracking-[0.45em] text-yellow-700">
          SKILL VERIFICATION
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {(profile.skillsVerified || []).map(
            (skill) => (
              <span
                key={skill}
                className="border border-yellow-700/30 bg-yellow-500/10 px-4 py-2 text-[10px] tracking-[0.2em] text-yellow-200"
              >
                {skill}
              </span>
            )
          )}
          {!(profile.skillsVerified || []).length && (
            <p className="text-zinc-500">
              No verified skills have been published yet.
            </p>
          )}
        </div>

        {profile.portfolioUrl && (
          <Link
            href={profile.portfolioUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex w-full justify-center break-all border border-yellow-700/40 bg-yellow-500/10 px-5 py-3 text-center text-[10px] tracking-[0.3em] text-yellow-300 sm:w-auto"
          >
            VIEW PORTFOLIO
          </Link>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ProfileList
          label="ACHIEVEMENTS"
          items={profile.achievements || []}
          empty="No achievements have been recorded yet."
        />
        <ProfileList
          label="DEPARTMENTS"
          items={profile.departments || []}
          empty="No departments have been assigned yet."
        />
      </section>
    </div>
  );
}

function ProfileStat({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="border border-white/10 bg-black/25 p-4">
      <p className="text-[9px] tracking-[0.28em] text-yellow-700">
        {label}
      </p>
      <p className="mt-2 text-zinc-100">
        {value || "Unavailable"}
      </p>
    </div>
  );
}

function ProfileList({
  label,
  items,
  empty,
}: {
  label: string;
  items: string[];
  empty: string;
}) {
  return (
    <section className="border border-yellow-900/20 bg-black/35 p-5 backdrop-blur-xl sm:p-8">
      <p className="text-[10px] tracking-[0.45em] text-yellow-700">
        {label}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {items.length ? (
          items.map((item) => (
            <span
              key={item}
              className="border border-yellow-700/30 bg-yellow-500/10 px-4 py-2 text-[10px] tracking-[0.2em] text-yellow-200"
            >
              {item}
            </span>
          ))
        ) : (
          <p className="text-zinc-500">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}
