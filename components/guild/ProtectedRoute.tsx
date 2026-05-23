"use client";

import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import {
  canAccessAdminPages,
  canAccessStaffPages,
  getEffectiveRole,
  isCentralGuildUser,
} from "@/lib/guildAccess";

import {
  useGuildAuth,
} from "./GuildAuthLogic";

type AccessLevel =
  | "signed-in"
  | "adventurer"
  | "admin"
  | "owner"
  | "staff";

type ProtectedRouteProps = {
  access: AccessLevel;
  children: React.ReactNode;
};

export default function ProtectedRoute({
  access,
  children,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    user,
    guildProfile,
    loading,
  } = useGuildAuth();

  const role = getEffectiveRole(
    user,
    guildProfile
  );

  const isAllowed = (() => {
    if (loading) {
      return false;
    }

    if (!user) {
      return false;
    }

    if (access === "signed-in") {
      return true;
    }

    if (access === "owner") {
      return isCentralGuildUser(user);
    }

    if (access === "admin") {
      return canAccessAdminPages(role);
    }

    if (access === "staff") {
      return canAccessStaffPages(role);
    }

    return Boolean(
      guildProfile?.approved
    );
  })();

  useEffect(() => {
    if (loading || isAllowed) {
      return;
    }

    if (!user) {
      router.replace(
        `/login?next=${encodeURIComponent(
          pathname
        )}`
      );
      return;
    }

    if (access === "adventurer") {
      if (!guildProfile) {
        router.replace("/register");
        return;
      }

      if (!guildProfile.approved) {
        router.replace("/guild-card");
        return;
      }
    }

    router.replace("/");
  }, [
    access,
    guildProfile,
    isAllowed,
    loading,
    pathname,
    router,
    user,
  ]);

  if (loading || !isAllowed) {
    return (
      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#070707]
          px-6
          text-center
          text-white
        "
      >
        <div>
          <p className="text-[10px] tracking-[0.45em] text-yellow-700">
            GUILD ACCESS CHECK
          </p>
          <h1 className="font-cinzel mt-5 text-4xl text-yellow-400">
            Verifying Access
          </h1>
          <p className="mt-5 text-xl italic text-zinc-500">
            Please wait while the guild seal is checked.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
