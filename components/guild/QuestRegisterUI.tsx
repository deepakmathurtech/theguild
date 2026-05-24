"use client";

import { useState } from "react";

import Image from "next/image";

import GuildInput from "./GuildInput";

type QuestRegisterUIProps = {
  onSubmit: (data: any) => Promise<void>;
};

export default function QuestRegisterUI({
  onSubmit,
}: QuestRegisterUIProps) {

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  /* FORM */
  const [questTitle, setQuestTitle] =
    useState("");

  const [reward, setReward] =
    useState("");

  const [contactEmail, setContactEmail] =
    useState("");

  const [deadline, setDeadline] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [skills, setSkills] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [maxApplicants, setMaxApplicants] =
    useState("");

  /* QUEST TYPES */
  const [remoteQuest, setRemoteQuest] =
    useState(false);

  const [fieldQuest, setFieldQuest] =
    useState(false);

  const [eliteQuest, setEliteQuest] =
    useState(false);

  /* SUBMIT */
  async function handleSubmit() {

    try {

      setLoading(true);

      setError("");

      const questTypes = [];

      if (remoteQuest) {
        questTypes.push("REMOTE");
      }

      if (fieldQuest) {
        questTypes.push("FIELD");
      }

      if (eliteQuest) {
        questTypes.push("ELITE");
      }

      await onSubmit({
        title: questTitle,

        reward,

        contactEmail,

        deadline,

        description,

        requiredSkills: skills,

        location,

        maxApplicants,

        questTypes,
      });

      setSuccess(true);

      /* RESET */
      setQuestTitle("");
      setReward("");
      setContactEmail("");
      setDeadline("");
      setDescription("");
      setSkills("");
      setLocation("");
      setMaxApplicants("");

      setRemoteQuest(false);
      setFieldQuest(false);
      setEliteQuest(false);

    } catch (error: any) {

      console.log(error);

      setError(
        error.message ||
        "Failed to submit quest."
      );

    } finally {

      setLoading(false);

    }
  }

  return (
    <section
      className="
        relative
        z-10
        flex
        min-h-screen
        items-center
        justify-center
        px-6
        py-20
      "
    >

      {/* PAPER */}
      <div
        className="
          relative
          w-full
          max-w-5xl
          rotate-[-1deg]
          overflow-hidden
          border-[5px]
          border-[#c9ae7b]
          bg-[#e8d8b4]
          p-10
          text-black
          shadow-[0_35px_120px_rgba(0,0,0,0.7)]
        "
      >

        {/* TEXTURE */}
        <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/old-wall.png')]" />

        {/* STAMP */}
        <div
          className="
            absolute
            right-8
            top-8
            rotate-[18deg]
            opacity-70
            mix-blend-multiply
          "
        >

          <Image
            src="/stamp.png"
            alt="Guild Stamp"
            width={140}
            height={140}
            className="select-none blur-[0.2px]"
          />

        </div>

        {/* PENDING */}
        <div
          className="
            absolute
            right-14
            bottom-24
            rotate-[-12deg]
            border-[3px]
            border-red-800
            px-5
            py-2
            text-lg
            font-black
            tracking-[0.3em]
            text-red-900/60
          "
        >
          PENDING
        </div>

        {/* WATERMARK */}
        <div className="absolute bottom-0 right-6 text-[160px] font-black text-black/[0.04]">
          ⚔
        </div>

        {/* CONTENT */}
        <div className="relative z-10">

          {/* HEADER */}
          <div className="border-b border-black/10 pb-6">

            <p
              className="
                text-[10px]
                tracking-[0.45em]
                text-[#6a4b32]
              "
            >
              OFFICIAL GUILD DOCUMENT
            </p>

            <h1
              className="
                font-cinzel
                mt-3
                text-5xl
                font-semibold
                tracking-[0.08em]
                text-[#24160d]
              "
            >
              Quest Registration
            </h1>

            <p
              className="
                mt-4
                text-xs
                tracking-[0.35em]
                text-[#7b5a3f]
              "
            >
              REQUEST FOR GUILD ASSISTANCE
            </p>

          </div>

          {/* SUCCESS */}
          {success && (
            <div
              className="
                mt-6
                border
                border-green-900/20
                bg-green-950/10
                p-4
                text-sm
                text-green-900
              "
            >
              Quest submitted for guild verification. It will appear on the board after staff approval.
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div
              className="
                mt-6
                border
                border-red-900/20
                bg-red-950/10
                p-4
                text-sm
                text-red-900
              "
            >
              {error}
            </div>
          )}

          {/* FORM */}
          <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">

            <GuildInput
              label="QUEST TITLE"
              placeholder="Need Cinematic Video Editor"
              value={questTitle}
              onChange={(e) =>
                setQuestTitle(e.target.value)
              }
            />

            <GuildInput
              label="REWARD"
              placeholder="Rs 5,000"
              value={reward}
              onChange={(e) =>
                setReward(e.target.value)
              }
            />

            <GuildInput
              label="CONTACT EMAIL"
              value={contactEmail}
              onChange={(e) =>
                setContactEmail(e.target.value)
              }
            />

            <GuildInput
              label="DEADLINE"
              placeholder="24 MAY 2026"
              value={deadline}
              onChange={(e) =>
                setDeadline(e.target.value)
              }
            />

          </div>

          {/* QUEST TYPES */}
          <div className="mt-10">

            <p
              className="
                mb-4
                text-[10px]
                tracking-[0.35em]
                text-[#6a4b32]
              "
            >
              QUEST TYPE
            </p>

            <div className="flex flex-wrap gap-5">

              <CheckOption
                label="REMOTE QUEST"
                checked={remoteQuest}
                onChange={() =>
                  setRemoteQuest(!remoteQuest)
                }
              />

              <CheckOption
                label="FIELD QUEST"
                checked={fieldQuest}
                onChange={() =>
                  setFieldQuest(!fieldQuest)
                }
              />

              <CheckOption
                label="ELITE QUEST"
                checked={eliteQuest}
                onChange={() =>
                  setEliteQuest(!eliteQuest)
                }
              />

            </div>

          </div>

          {/* GUILD FILLED */}
          <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">

            <div>

              <label
                className="
                  mb-2
                  block
                  text-[10px]
                  tracking-[0.35em]
                  text-[#6a4b32]
                "
              >
                DIFFICULTY RANK
              </label>

              <div
                className="
                  flex
                  h-[58px]
                  items-center
                  border-b-2
                  border-dashed
                  border-black/20
                  px-1
                  text-lg
                  italic
                  text-black/40
                "
              >
                To be assigned by guild council
              </div>

            </div>

            <GuildInput
              label="ACCEPTED SLOTS"
              placeholder="How many adventurers can be accepted?"
              value={maxApplicants}
              onChange={(e) =>
                setMaxApplicants(e.target.value)
              }
            />

          </div>

          {/* DESCRIPTION */}
          <div className="mt-10">

            <label
              className="
                mb-2
                block
                text-[10px]
                tracking-[0.35em]
                text-[#6a4b32]
              "
            >
              QUEST DESCRIPTION
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Describe the quest objectives..."
              className="
                font-cormorant
                h-32
                w-full
                resize-none
                border-b-2
                border-black/20
                bg-transparent
                text-2xl
                italic
                outline-none
                focus:border-[#8c5d17]
              "
            />

          </div>

          {/* SKILLS */}
          <div className="mt-10">

            <label
              className="
                mb-2
                block
                text-[10px]
                tracking-[0.35em]
                text-[#6a4b32]
              "
            >
              REQUIRED SKILLS
            </label>

            <textarea
              value={skills}
              onChange={(e) =>
                setSkills(e.target.value)
              }
              placeholder="Editing, Development..."
              className="
                font-cormorant
                h-24
                w-full
                resize-none
                border-b-2
                border-black/20
                bg-transparent
                text-2xl
                italic
                outline-none
                focus:border-[#8c5d17]
              "
            />

          </div>

          {/* LOCATION */}
          <div className="mt-10">

            <GuildInput
              label="LOCATION"
              placeholder="Remote / Mumbai"
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
            />

          </div>

          {/* FOOTER */}
          <div className="mt-12 flex items-end justify-between border-t border-black/10 pt-6">

            <div>

              <p
                className="
                  text-[10px]
                  tracking-[0.35em]
                  text-[#6a4b32]
                "
              >
                QUEST AUTHORIZATION
              </p>

              <div className="mt-3 h-[2px] w-52 bg-black/20" />

              <p
                className="
                  font-cormorant
                  mt-2
                  text-xl
                  italic
                  text-[#3a2616]
                "
              >
                Signature of Requester
              </p>

            </div>

            {/* SUBMIT */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="
                border-[3px]
                border-[#24160d]
                bg-black/5
                px-8
                py-3
                text-[10px]
                font-black
                tracking-[0.35em]
                transition
                hover:bg-[#24160d]
                hover:text-[#e8d8b4]
                disabled:opacity-50
              "
            >
              {loading
                ? "PROCESSING..."
                : "POST QUEST"}
            </button>

          </div>

        </div>

      </div>

    </section>
  );
}

/* CHECK OPTION */
function CheckOption({
  label,
  checked,
  onChange,
}: any) {

  return (
    <button
      type="button"
      onClick={onChange}
      className="
        flex
        w-full
        sm:w-auto
        text-left
        items-center
        gap-3
      "
    >

      <div
        className={`
          flex
          h-6
          w-6
          items-center
          justify-center
          border-2
          border-black
          text-sm
          font-black
          ${
            checked
              ? "bg-black text-[#e8d8b4]"
              : "bg-transparent"
          }
        `}
      >
        {checked ? "✓" : ""}
      </div>

      <p
        className="
          text-sm
          tracking-[0.25em]
        "
      >
        {label}
      </p>

    </button>
  );
}
