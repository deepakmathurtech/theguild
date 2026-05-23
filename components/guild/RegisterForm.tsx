"use client";

import { useState } from "react";

import Image from "next/image";

import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { updateProfile } from "firebase/auth";

import { db } from "@/lib/firebase";
import {
  generateAdventurerId,
  getRankCode,
} from "@/lib/adventurerId";

import { useGuildAuth } from "./GuildAuthLogic";
import GuildInput from "./GuildInput";

const defaultGuildRank =
  "F-RANK";

export default function RegisterForm() {
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
  const [cityCode, setCityCode] =
    useState("");
  const [genderCode, setGenderCode] =
    useState("M");
  const [publicTagline, setPublicTagline] =
    useState("");
  const [portfolioUrl, setPortfolioUrl] =
    useState("");
  const [error, setError] =
    useState("");

  async function handleRegister() {
    if (!user) {
      return;
    }

    if (
      !fullName ||
      !specialization ||
      !contact ||
      !experience ||
      !cityName ||
      !cityCode ||
      !genderCode
    ) {
      setError(
        "All guild registration fields are required."
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
            cityCode,
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
          name: fullName,
          guildRank:
            defaultGuildRank,
          reputation: 0,
          questsCompleted: 0,
          completedQuestLog: [],
          specialization,
          contact,
          experience,
          cityName,
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
        }
      );

      window.location.href =
        "/guild-card";
    } catch (registrationError) {
      console.log(
        registrationError
      );
      setError(
        "Failed to register adventurer."
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
        min-h-[calc(100vh-110px)]
        items-center
        justify-center
        px-6
        py-8
      "
    >
      <div
        className="
          relative
          w-full
          max-w-5xl
          rotate-[-1.5deg]
          overflow-hidden
          border-[5px]
          border-[#c9ae7b]
          bg-[#e8d8b4]
          p-8
          text-black
          shadow-[0_35px_100px_rgba(0,0,0,0.65)]
        "
      >
        <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/old-wall.png')]" />
        <div className="absolute inset-0 bg-black/[0.03]" />
        <div className="absolute left-5 top-5 h-4 w-4 rounded-full bg-[#6d4c1c]" />
        <div className="absolute right-5 top-5 h-4 w-4 rounded-full bg-[#6d4c1c]" />

        <div className="absolute right-10 top-10 rotate-[18deg] opacity-80">
          <Image
            src="/stamp.png"
            alt="Guild Stamp"
            width={130}
            height={130}
            className="select-none"
          />
        </div>

        <div className="absolute bottom-0 right-6 text-[150px] font-black text-black/[0.04]">
          ID
        </div>

        <div className="relative z-10">
          <div className="border-b border-black/10 pb-5">
            <p className="text-[10px] tracking-[0.4em] text-zinc-600">
              OFFICIAL GUILD DOCUMENT
            </p>
            <h1 className="mt-3 text-4xl font-black leading-none">
              Adventurer Registration
            </h1>
            <p className="mt-4 text-sm text-zinc-600">
              Every approved record receives a guild identity like
              `TG-LDH-26MF-00001`.
            </p>
          </div>

          {error && (
            <div className="mt-6 border border-red-900/20 bg-red-950/10 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="mt-8 grid gap-x-8 gap-y-6 md:grid-cols-2">
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
              label="CITY CODE"
              placeholder="LDH"
              value={cityCode}
              onChange={(event) =>
                setCityCode(
                  event.target.value
                    .toUpperCase()
                )
              }
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
              <label className="mb-3 block text-xs tracking-[0.3em] text-zinc-700">
                GENDER CODE
              </label>
              <select
                value={genderCode}
                onChange={(event) =>
                  setGenderCode(
                    event.target.value
                  )
                }
                className="w-full border-2 border-black/10 bg-black/[0.02] p-4 outline-none focus:border-[#8c5d17]"
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

          <div className="mt-6">
            <label className="mb-3 block text-xs tracking-[0.3em] text-zinc-700">
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
              className="h-24 w-full resize-none border-2 border-black/10 bg-black/[0.02] p-4 outline-none placeholder:text-zinc-500 focus:border-[#8c5d17]"
            />
          </div>

          <div className="mt-8 flex items-end justify-between gap-4 border-t border-black/10 pt-5">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-zinc-600">
                GUILD AUTHORIZATION
              </p>
              <div className="mt-3 h-[2px] w-44 bg-black/20" />
              <p className="mt-2 text-[10px] italic text-zinc-600">
                Signature of Adventurer
              </p>
            </div>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="border-[3px] border-black bg-black/5 px-7 py-3 text-[10px] font-black tracking-[0.3em] transition hover:bg-black hover:text-[#e8d8b4] disabled:opacity-50"
            >
              {loading
                ? "PROCESSING..."
                : "SUBMIT DOCUMENT"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
