"use client";

import Image from "next/image";
import Link from "next/link";

import { useState } from "react";

import {
  getAuth,
  signOut,
} from "firebase/auth";

import { app } from "@/lib/firebase";

import {
  canAccessStaffPages,
  getEffectiveRole,
  isCentralGuildUser,
} from "@/lib/guildAccess";

import {
  useGuildAuth,
} from "./GuildAuthLogic";

export default function GuildNavbar() {

  const {
    user,
    guildProfile,
  } = useGuildAuth();

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const auth = getAuth(app);

  const role = getEffectiveRole(
    user,
    guildProfile
  );

  const showAdmin =
    user && isCentralGuildUser(user);

  const showTech =
    user && canAccessStaffPages(role);

  const handleLogout =
    async () => {
      await signOut(auth);
    };

  return (
    <header
      className="
        fixed top-0 left-0 z-50
        w-full
        border-b border-yellow-900/20
        bg-black/60
        backdrop-blur-xl
      "
    >

      {/* MAIN BAR */}
      <div
        className="
          flex items-center justify-between
          gap-4
          px-4 py-4
          sm:px-6
          md:px-8
        "
      >

        {/* LEFT */}
        <Link
          href="/"
          className="
            group
            flex items-center gap-3
            shrink-0
          "
        >

          {/* LOGO */}
          <div className="relative">

            <div
              className="
                absolute inset-0
                rounded-full
                bg-yellow-500/20
                blur-md
                opacity-0
                transition
                duration-500
                group-hover:opacity-100
              "
            />

            <Image
              src="/guild-logo.png"
              alt="Guild Emblem"
              width={38}
              height={38}
              className="
                relative
                opacity-90
                transition
                duration-300
                group-hover:scale-105
              "
            />

          </div>

          {/* TITLE */}
          <div className="flex flex-col leading-tight">

            <span
              className="
                text-[9px]
                tracking-[0.35em]
                text-yellow-500
                sm:text-[10px]
                md:tracking-[0.5em]
              "
            >
              THE GUILD
            </span>

            <span
              className="
                hidden
                text-[10px]
                text-zinc-500
                md:block
              "
            >
              STRIVE • SURPASS • SOVEREIGN
            </span>

          </div>

        </Link>

        {/* DESKTOP NAV */}
        <nav
          className="
            hidden
            flex-1
            items-center
            justify-center
            gap-6
            text-[10px]
            tracking-[0.24em]
            text-zinc-400
            lg:flex
          "
        >

          <Link
            href="/quests"
            className="transition hover:text-yellow-400"
          >
            QUESTS
          </Link>

          {user && (
            <Link
              href="/rankings"
              className="transition hover:text-yellow-400"
            >
              RANKINGS
            </Link>
          )}

          <Link
            href="/tavern"
            className="transition hover:text-yellow-400"
          >
            TAVERN
          </Link>

          <Link
            href="/questregister"
            className="transition hover:text-yellow-400"
          >
            ADD QUEST
          </Link>

          <Link
            href="/myquests"
            className="transition hover:text-yellow-400"
          >
            MY QUEST
          </Link>

          {showTech && (
            <Link
              href="/tech"
              className="transition hover:text-yellow-400"
            >
              TECH
            </Link>
          )}

          {showAdmin && (
            <Link
              href="/admin"
              className="transition hover:text-yellow-400"
            >
              ADMIN
            </Link>
          )}

          {!user && (
            <Link
              href="/register"
              className="transition hover:text-yellow-400"
            >
              REGISTRY
            </Link>
          )}

        </nav>

        {/* RIGHT */}
        <div
          className="
            flex items-center gap-2
            shrink-0
          "
        >

          {/* GUILD CARD */}
          {user && (
            <Link
              href="/guild-card"
              className="
                group
                relative
                hidden
                md:flex
                items-center
                gap-3
                transition-all
                duration-300
              "
            >

              {/* CARD */}
              <div
                className="
                  relative
                  flex h-10 w-16
                  items-center justify-center
                  overflow-hidden
                  border
                  border-yellow-700/40
                  bg-gradient-to-br
                  from-[#1c1309]
                  via-black
                  to-[#120b05]
                  transition-all
                  duration-300
                  group-hover:border-yellow-500/50
                  group-hover:shadow-[0_0_20px_rgba(255,180,0,0.15)]
                "
              >

                <div
                  className="
                    absolute inset-0
                    bg-gradient-to-br
                    from-yellow-500/10
                    via-transparent
                    to-transparent
                  "
                />

                <div
                  className="
                    absolute top-0 left-0
                    h-[1px] w-full
                    bg-yellow-500/20
                  "
                />

                <Image
                  src="/guild-logo.png"
                  alt="Guild Card"
                  width={18}
                  height={18}
                  className="
                    relative
                    opacity-90
                    transition
                    duration-300
                    group-hover:scale-110
                  "
                />

              </div>

              {/* TEXT */}
              <div className="flex flex-col leading-tight">

                <span
                  className="
                    text-[7px]
                    tracking-[0.32em]
                    text-yellow-600
                  "
                >
                  ACCESS YOUR
                </span>

                <span
                  className="
                    text-[11px]
                    tracking-[0.18em]
                    text-zinc-200
                  "
                >
                  GUILD CARD
                </span>

              </div>

            </Link>
          )}

          {/* LOGIN / LOGOUT */}
          {!user ? (
            <Link
              href="/login"
              className="
                rounded-xl
                border border-yellow-700/30
                bg-yellow-500/10
                px-3 py-2
                text-[9px]
                tracking-[0.22em]
                text-yellow-400
                transition-all
                duration-300
                hover:border-yellow-500/40
                hover:bg-yellow-500/20
                sm:px-4
                sm:text-[10px]
              "
            >
              LOGIN
            </Link>
          ) : (
            <button
              onClick={handleLogout}
              className="
                rounded-xl
                border border-red-800/30
                bg-red-950/20
                px-3 py-2
                text-[9px]
                tracking-[0.22em]
                text-red-400
                transition-all
                duration-300
                hover:border-red-500/40
                hover:bg-red-900/30
                sm:px-4
                sm:text-[10px]
              "
            >
              LOGOUT
            </button>
          )}

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenu}
            onClick={() =>
              setMobileMenu(!mobileMenu)
            }
            className="
              flex h-10 w-10
              items-center justify-center
              rounded-lg
              border border-yellow-800/30
              text-yellow-500
              lg:hidden
            "
          >
            ☰
          </button>

        </div>

      </div>

      {/* MOBILE MENU */}
      {mobileMenu && (

        <div
          className="
            border-t border-yellow-900/20
            bg-black/95
            px-6 py-6
            lg:hidden
          "
        >

          <nav
            className="
              flex flex-col gap-5
              text-[11px]
              tracking-[0.28em]
              text-zinc-300
            "
          >

            <Link href="/quests">
              QUESTS
            </Link>

            {user && (
              <Link href="/rankings">
                RANKINGS
              </Link>
            )}

            <Link href="/tavern">
              TAVERN
            </Link>

            <Link href="/questregister">
              ADD QUEST
            </Link>

            <Link href="/myquests">
              MY QUEST
            </Link>

            {showTech && (
              <Link href="/tech">
                TECH
              </Link>
            )}

            {showAdmin && (
              <Link href="/admin">
                ADMIN
              </Link>
            )}

            {!user && (
              <Link href="/register">
                REGISTRY
              </Link>
            )}

            {user && (
              <Link href="/guild-card">
                GUILD CARD
              </Link>
            )}

          </nav>

        </div>

      )}

    </header>
  );
}
