"use client";

import { useState } from "react";

import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type AdventurerRecord = {
  uid: string;
  adventurerId?: string;
  name?: string;
  email?: string;
  guildRank?: string;
  reputation?: number;
  questsCompleted?: number;
  specialization?: string;
  contact?: string;
  experience?: string;
  cityName?: string;
  cityCode?: string;
  gender?: string;
  genderCode?: string;
  publicTagline?: string;
  portfolioUrl?: string;
  verificationNotes?: string;
  skillsVerified?: string[];
  approved?: boolean;
  role?: string;
  completedQuestLog?: Array<{
    questId?: string;
    title: string;
    completedAt: string;
    summary?: string;
  }>;
};

type AdventurerProfileLookupProps = {
  title: string;
  allowEditing?: boolean;
};

export default function AdventurerProfileLookup({
  title,
  allowEditing = false,
}: AdventurerProfileLookupProps) {
  const [searchValue, setSearchValue] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [record, setRecord] =
    useState<AdventurerRecord | null>(
      null
    );
  const [verifiedSkills, setVerifiedSkills] =
    useState("");
  const [verificationNotes, setVerificationNotes] =
    useState("");
  const [publicTagline, setPublicTagline] =
    useState("");
  const [portfolioUrl, setPortfolioUrl] =
    useState("");
  const [completedQuestTitle, setCompletedQuestTitle] =
    useState("");
  const [completedQuestId, setCompletedQuestId] =
    useState("");
  const [completedQuestSummary, setCompletedQuestSummary] =
    useState("");

  async function searchProfile() {
    if (!searchValue.trim()) {
      setError(
        "Enter an adventurer ID first."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const snapshot = await getDocs(
        query(
          collection(db, "adventurers"),
          where(
            "adventurerId",
            "==",
            searchValue.trim().toUpperCase()
          )
        )
      );

      if (snapshot.empty) {
        setRecord(null);
        setError(
          "No adventurer found for that ID."
        );
        return;
      }

      const found = {
        ...(snapshot.docs[0].data() as AdventurerRecord),
        uid: snapshot.docs[0].id,
      };

      setRecord(found);
      setVerifiedSkills(
        (found.skillsVerified || []).join(
          ", "
        )
      );
      setVerificationNotes(
        found.verificationNotes || ""
      );
      setPublicTagline(
        found.publicTagline || ""
      );
      setPortfolioUrl(
        found.portfolioUrl || ""
      );
    } catch (searchError) {
      console.log(searchError);
      setError(
        "Unable to load adventurer profile."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProfileDetails() {
    if (!record) {
      return;
    }

    await updateDoc(
      doc(db, "adventurers", record.uid),
      {
        publicTagline:
          publicTagline.trim(),
        portfolioUrl:
          portfolioUrl.trim(),
        verificationNotes:
          verificationNotes.trim(),
        skillsVerified:
          verifiedSkills
            .split(",")
            .map((skill) =>
              skill.trim()
            )
            .filter(Boolean),
        updatedAt:
          serverTimestamp(),
      }
    );

    await searchProfile();
  }

  async function addCompletedQuest() {
    if (
      !record ||
      !completedQuestTitle.trim()
    ) {
      setError(
        "Completed quest title is required."
      );
      return;
    }

    await updateDoc(
      doc(db, "adventurers", record.uid),
      {
        questsCompleted:
          (record.questsCompleted || 0) + 1,
        completedQuestLog:
          arrayUnion({
            questId:
              completedQuestId.trim(),
            title:
              completedQuestTitle.trim(),
            summary:
              completedQuestSummary.trim(),
            completedAt:
              new Date().toISOString(),
          }),
        updatedAt:
          serverTimestamp(),
      }
    );

    setCompletedQuestTitle("");
    setCompletedQuestId("");
    setCompletedQuestSummary("");
    await searchProfile();
  }

  return (
    <section className="border border-yellow-900/20 bg-black/35 p-6 backdrop-blur-xl">
      <p className="text-[10px] tracking-[0.45em] text-yellow-700">
        PROFILE LOOKUP
      </p>
      <h2 className="font-cinzel mt-3 text-3xl text-yellow-400">
        {title}
      </h2>

      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        <input
          type="text"
          value={searchValue}
          onChange={(event) =>
            setSearchValue(
              event.target.value
                .toUpperCase()
            )
          }
          placeholder="TG-LDH-26MF-00001"
          className="flex-1 border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
        />
        <button
          type="button"
          onClick={searchProfile}
          className="border border-yellow-700/40 bg-yellow-500/10 px-5 py-3 text-[10px] tracking-[0.3em] text-yellow-300"
        >
          SEARCH PROFILE
        </button>
      </div>

      {error && (
        <div className="mt-4 border border-red-900/30 bg-red-950/20 p-4 text-red-200">
          {error}
        </div>
      )}

      {loading && (
        <p className="mt-4 text-[10px] tracking-[0.3em] text-yellow-500">
          LOADING PROFILE...
        </p>
      )}

      {record && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-white/10 bg-black/25 p-5">
            <p className="text-[10px] tracking-[0.28em] text-yellow-700">
              PUBLIC + INTERNAL IDENTITY
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Detail label="ADVENTURER ID" value={record.adventurerId} />
              <Detail label="NAME" value={record.name} />
              <Detail label="RANK" value={record.guildRank} />
              <Detail label="ROLE" value={record.role} />
              <Detail label="CITY" value={record.cityName} />
              <Detail label="CITY CODE" value={record.cityCode} />
              <Detail label="GENDER" value={record.gender} />
              <Detail
                label="STATUS"
                value={
                  record.approved
                    ? "APPROVED"
                    : "PENDING"
                }
              />
              <Detail label="EMAIL" value={record.email} />
              <Detail label="CONTACT" value={record.contact} />
              <Detail
                label="QUESTS COMPLETED"
                value={String(record.questsCompleted || 0)}
              />
              <Detail
                label="REPUTATION"
                value={String(record.reputation || 0)}
              />
            </div>

            <TextBlock
              label="SPECIALIZATION"
              value={record.specialization}
            />
            <TextBlock
              label="EXPERIENCE"
              value={record.experience}
            />
            <TextBlock
              label="PUBLIC TAGLINE"
              value={record.publicTagline}
            />
            <TextBlock
              label="VERIFICATION NOTES"
              value={record.verificationNotes}
            />
          </div>

          <div className="space-y-6">
            <div className="border border-white/10 bg-black/25 p-5">
              <p className="text-[10px] tracking-[0.28em] text-yellow-700">
                VERIFIED SKILLS
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(record.skillsVerified || []).map(
                  (skill) => (
                    <span
                      key={skill}
                      className="border border-yellow-700/30 bg-yellow-500/10 px-3 py-2 text-[10px] tracking-[0.2em] text-yellow-200"
                    >
                      {skill}
                    </span>
                  )
                )}
                {!(record.skillsVerified || []).length && (
                  <p className="text-zinc-500">
                    No verified skills yet.
                  </p>
                )}
              </div>
            </div>

            <div className="border border-white/10 bg-black/25 p-5">
              <p className="text-[10px] tracking-[0.28em] text-yellow-700">
                COMPLETED QUEST LOG
              </p>
              <div className="mt-4 space-y-3">
                {(record.completedQuestLog || []).map(
                  (quest) => (
                    <div
                      key={`${quest.title}-${quest.completedAt}`}
                      className="border border-white/10 p-3"
                    >
                      <p className="text-yellow-200">
                        {quest.title}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {quest.summary || "No summary provided."}
                      </p>
                    </div>
                  )
                )}
                {!(record.completedQuestLog || []).length && (
                  <p className="text-zinc-500">
                    No completed quest records stored yet.
                  </p>
                )}
              </div>
            </div>

            {allowEditing && (
              <>
                <div className="border border-white/10 bg-black/25 p-5">
                  <p className="text-[10px] tracking-[0.28em] text-yellow-700">
                    PUBLIC PROFILE EDITOR
                  </p>
                  <input
                    type="text"
                    value={publicTagline}
                    onChange={(event) =>
                      setPublicTagline(
                        event.target.value
                      )
                    }
                    placeholder="Short public headline"
                    className="mt-4 w-full border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
                  />
                  <input
                    type="text"
                    value={portfolioUrl}
                    onChange={(event) =>
                      setPortfolioUrl(
                        event.target.value
                      )
                    }
                    placeholder="Portfolio or proof link"
                    className="mt-3 w-full border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
                  />
                  <textarea
                    value={verifiedSkills}
                    onChange={(event) =>
                      setVerifiedSkills(
                        event.target.value
                      )
                    }
                    placeholder="Verified skills, comma separated"
                    className="mt-3 h-24 w-full resize-none border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
                  />
                  <textarea
                    value={verificationNotes}
                    onChange={(event) =>
                      setVerificationNotes(
                        event.target.value
                      )
                    }
                    placeholder="Staff-only verification notes"
                    className="mt-3 h-28 w-full resize-none border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={saveProfileDetails}
                    className="mt-4 w-full border border-yellow-700/40 bg-yellow-500/10 px-4 py-3 text-[10px] tracking-[0.3em] text-yellow-300"
                  >
                    SAVE PROFILE DETAILS
                  </button>
                </div>

                <div className="border border-white/10 bg-black/25 p-5">
                  <p className="text-[10px] tracking-[0.28em] text-yellow-700">
                    ADD COMPLETED QUEST
                  </p>
                  <input
                    type="text"
                    value={completedQuestTitle}
                    onChange={(event) =>
                      setCompletedQuestTitle(
                        event.target.value
                      )
                    }
                    placeholder="Quest title"
                    className="mt-4 w-full border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
                  />
                  <input
                    type="text"
                    value={completedQuestId}
                    onChange={(event) =>
                      setCompletedQuestId(
                        event.target.value
                      )
                    }
                    placeholder="Quest ID (optional)"
                    className="mt-3 w-full border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
                  />
                  <textarea
                    value={completedQuestSummary}
                    onChange={(event) =>
                      setCompletedQuestSummary(
                        event.target.value
                      )
                    }
                    placeholder="What was completed and how it was verified"
                    className="mt-3 h-28 w-full resize-none border border-white/10 bg-black px-4 py-3 text-zinc-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCompletedQuest}
                    className="mt-4 w-full border border-yellow-700/40 bg-yellow-500/10 px-4 py-3 text-[10px] tracking-[0.3em] text-yellow-300"
                  >
                    STORE COMPLETED QUEST
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div>
      <p className="text-[9px] tracking-[0.28em] text-yellow-700">
        {label}
      </p>
      <p className="mt-2 text-zinc-100">
        {value || "Unavailable"}
      </p>
    </div>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="mt-5">
      <p className="text-[9px] tracking-[0.28em] text-yellow-700">
        {label}
      </p>
      <p className="mt-2 text-zinc-300">
        {value || "Unavailable"}
      </p>
    </div>
  );
}
