"use client";

import { useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { updateProfile } from "firebase/auth";

import { db } from "@/lib/firebase";
import {
  generateAdventurerId,
  getCityCode,
  getRankCode,
} from "@/lib/adventurerId";
import { upsertPublicAdventurerProfile } from "@/lib/publicAdventurerProfile";

import { useGuildAuth } from "./GuildAuthLogic";
import GuildInput from "./GuildInput";

const defaultGuildRank =
  "F-RANK";

export default function RegisterForm() {
  const router = useRouter();

  const {
    user,
  } = useGuildAuth();

  const [loading, setLoading] =
    useState(false);

  const [fullName, setFullName] =
    useState(user?.displayName || "");
  const [specialization, setSpecialization] =
    useState("");
  const [contact, setContact] =
    useState("");
  const [experience, setExperience] =
    useState("");
  const [cityName, setCityName] =
    useState("");
  const [genderCode, setGenderCode] =
    useState("M");
  const [publicTagline, setPublicTagline] =
    useState("");
  const [portfolioUrl, setPortfolioUrl] =
    useState("");
  const [error, setError] =
    useState("");

  const isFormComplete =
    Boolean(
      fullName.trim() &&
        specialization.trim() &&
        contact.trim() &&
        experience.trim() &&
        cityName.trim() &&
        genderCode
    );

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user) {
      setError(
        "Please login before registering."
      );
      return;
    }

    if (
      !fullName.trim() ||
      !specialization.trim() ||
      !contact.trim() ||
      !experience.trim() ||
      !cityName.trim() ||
      !genderCode
    ) {
      setError(
        "Complete the required guild registration fields first."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      await updateProfile(user, {
        displayName: fullName,
      });

      const registeredAt =
        new Date();

      const generatedIdentity =
        await generateAdventurerId(
          db,
          {
            cityName,
            genderCode,
            rankCode:
              getRankCode(
                defaultGuildRank
              ),
            registeredAt,
          }
        );

      await setDoc(
        doc(db, "adventurers", user.uid),
        {
          uid: user.uid,
          adventurerId:
            generatedIdentity.adventurerId,
          email: user.email,
          name: fullName.trim(),
          guildRank:
            defaultGuildRank,
          reputation: 0,
          questsCompleted: 0,
          completedQuestLog: [],
          specialization:
            specialization.trim(),
          contact: contact.trim(),
          experience:
            experience.trim(),
          cityName: cityName.trim(),
          cityCode:
            generatedIdentity.cityCode,
          gender:
            genderCode === "M"
              ? "Male"
              : genderCode === "F"
              ? "Female"
              : "Other",
          genderCode:
            generatedIdentity.genderCode,
          publicTagline:
            publicTagline.trim(),
          portfolioUrl:
            portfolioUrl.trim(),
          skillsVerified: [],
          verificationNotes: "",
          approved: false,
          role: "adventurer",
          createdAt:
            serverTimestamp(),
        },
        { merge: true }
      );

      await upsertPublicAdventurerProfile(
        db,
        user.uid,
        {
          uid: user.uid,
          adventurerId:
            generatedIdentity.adventurerId,
          name: fullName.trim(),
          guildRank:
            defaultGuildRank,
          specialization:
            specialization.trim(),
          cityName: cityName.trim(),
          publicTagline:
            publicTagline.trim(),
          skillsVerified: [],
          portfolioUrl:
            portfolioUrl.trim(),
          questsCompleted: 0,
          reputation: 0,
          approved: false,
        }
      );

      router.push("/guild-card");
      router.refresh();
    } catch (registrationError) {
      console.log(
        registrationError
      );
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : "Failed to register adventurer."
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
        min-h-[calc(100svh-110px)]
        items-center
        justify-center
        px-3
        py-20
        sm:px-6
        sm:py-24
        lg:py-10
      "
    >
      <form
        onSubmit={handleRegister}
        className="
          relative
          w-full
          max-w-6xl
          rotate-0
          overflow-hidden
          border-[5px]
          border-[#c9ae7b]
          bg-[#e8d8b4]
          p-4
          text-black
          shadow-[0_35px_100px_rgba(0,0,0,0.65)]
          sm:rotate-0
          sm:p-8
          lg:rotate-0
          lg:p-10
        "
      >
        <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/old-wall.png')]" />
        <div className="absolute inset-0 bg-black/[0.03]" />
        <div className="absolute left-5 top-5 h-4 w-4 rounded-full bg-[#6d4c1c]" />
        <div className="absolute right-5 top-5 h-4 w-4 rounded-full bg-[#6d4c1c]" />

        <div className="absolute right-3 top-3 rotate-[12deg] opacity-70 sm:right-10 sm:top-10 sm:rotate-[18deg] sm:opacity-80 lg:right-12 lg:top-8">
          <Image
            src="/stamp.png"
            alt="Guild Stamp"
            width={96}
            height={96}
            className="select-none"
          />
        </div>

        <div className="absolute bottom-0 right-3 text-[88px] font-black text-black/[0.04] sm:right-6 sm:text-[150px]">
          ID
        </div>

        <div className="relative z-10 lg:grid lg:grid-cols-[280px_1fr] lg:gap-10">
          <div className="border-b border-black/10 pb-4 sm:pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <div className="lg:sticky lg:top-28">
              <p className="text-[9px] tracking-[0.18em] text-zinc-600 sm:text-[10px] sm:tracking-[0.32em]">
                OFFICIAL GUILD DOCUMENT
              </p>
              <h1 className="mt-3 max-w-[15rem] text-2xl font-black leading-tight sm:max-w-none sm:text-4xl lg:text-5xl">
                Adventurer Registration
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:mt-4">
                Every approved record receives a guild identity like
                <span className="break-all font-mono text-xs">
                  {" "}
                  TG-LDH-26MF-00001
                </span>
                .
              </p>

              <div className="mt-8 hidden space-y-4 text-sm text-zinc-700 lg:block">
                <div className="border-l-2 border-black/20 pl-4">
                  <p className="text-[10px] font-black tracking-[0.28em]">
                    STEP 01
                  </p>
                  <p className="mt-2 leading-6">
                    Submit your identity and contact record.
                  </p>
                </div>
                <div className="border-l-2 border-black/20 pl-4">
                  <p className="text-[10px] font-black tracking-[0.28em]">
                    STEP 02
                  </p>
                  <p className="mt-2 leading-6">
                    Guild staff reviews the application.
                  </p>
                </div>
                <div className="border-l-2 border-black/20 pl-4">
                  <p className="text-[10px] font-black tracking-[0.28em]">
                    STEP 03
                  </p>
                  <p className="mt-2 leading-6">
                    Your card and public profile become active.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            {error && (
              <div className="mt-6 border border-red-900/20 bg-red-950/10 p-4 text-sm text-red-800 lg:mt-0">
                {error}
              </div>
            )}

          <div className="mt-6 grid gap-x-8 gap-y-5 sm:mt-8 md:grid-cols-2 lg:mt-0 xl:grid-cols-3">
            <GuildInput
              label="FULL NAME"
              placeholder="Enter adventurer name"
              value={fullName}
              onChange={(event) =>
                setFullName(
                  event.target.value
                )
              }
            />

            <GuildInput
              label="EMAIL"
              value={user?.email || ""}
              disabled
            />

            <GuildInput
              label="CITY"
              placeholder="Ludhiana"
              value={cityName}
              onChange={(event) =>
                setCityName(
                  event.target.value
                )
              }
            />

            <GuildInput
              label="CITY CODE (AUTO)"
              placeholder="Generated from city"
              value={
                cityName.trim()
                  ? getCityCode(cityName)
                  : ""
              }
              disabled
            />

            <GuildInput
              label="CONTACT"
              placeholder="Communication number"
              value={contact}
              onChange={(event) =>
                setContact(
                  event.target.value
                )
              }
            />

            <div>
              <label className="mb-2 block text-[10px] tracking-[0.22em] text-zinc-700 sm:mb-3 sm:text-xs sm:tracking-[0.3em]">
                GENDER CODE
              </label>
              <select
                value={genderCode}
                onChange={(event) =>
                  setGenderCode(
                    event.target.value
                  )
                }
                className="min-h-12 w-full border-2 border-black/10 bg-black/[0.02] p-3 text-base outline-none focus:border-[#8c5d17] sm:p-4"
              >
                <option value="M">
                  M
                </option>
                <option value="F">
                  F
                </option>
                <option value="O">
                  O
                </option>
              </select>
            </div>

            <GuildInput
              label="SPECIALIZATION"
              placeholder="Developer / Designer / Editor"
              value={specialization}
              onChange={(event) =>
                setSpecialization(
                  event.target.value
                )
              }
            />

            <GuildInput
              label="PUBLIC TAGLINE"
              placeholder="Frontend builder and motion designer"
              value={publicTagline}
              onChange={(event) =>
                setPublicTagline(
                  event.target.value
                )
              }
            />

            <GuildInput
              label="PORTFOLIO URL"
              placeholder="https://portfolio.example"
              value={portfolioUrl}
              onChange={(event) =>
                setPortfolioUrl(
                  event.target.value
                )
              }
            />
          </div>

          <div className="mt-5 sm:mt-6">
            <label className="mb-2 block text-[10px] tracking-[0.22em] text-zinc-700 sm:mb-3 sm:text-xs sm:tracking-[0.3em]">
              ABILITIES & EXPERIENCE
            </label>
            <textarea
              value={experience}
              onChange={(event) =>
                setExperience(
                  event.target.value
                )
              }
              placeholder="Describe your abilities and experience..."
              className="min-h-28 w-full resize-y border-2 border-black/10 bg-black/[0.02] p-3 text-base outline-none placeholder:text-zinc-500 focus:border-[#8c5d17] sm:p-4"
            />
          </div>

          <div className="mt-8 flex flex-col gap-5 border-t border-black/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] tracking-[0.18em] text-zinc-600 sm:tracking-[0.3em]">
                GUILD AUTHORIZATION
              </p>
              <div className="mt-3 h-[2px] w-44 bg-black/20" />
              <p className="mt-2 text-[10px] italic text-zinc-600">
                Signature of Adventurer
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              title={
                isFormComplete
                  ? "Submit registration"
                  : "Complete the required fields first"
              }
              className="min-h-12 w-full border-[3px] border-black bg-black/5 px-5 py-3 text-[10px] font-black tracking-[0.16em] transition hover:bg-black hover:text-[#e8d8b4] active:translate-y-px disabled:cursor-wait disabled:opacity-50 sm:w-auto sm:px-7 sm:tracking-[0.3em]"
            >
              {loading
                ? "PROCESSING..."
                : "SUBMIT DOCUMENT"}
            </button>
          </div>
          </div>
        </div>
      </form>
    </section>
  );
}
