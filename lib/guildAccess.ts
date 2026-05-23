import type { User } from "firebase/auth";

export const CENTRAL_GUILD_EMAIL =
  "thecentralguild@gmail.com";

export const GUILD_ROLES = [
  "adventurer",
  "tech",
  "admin",
  "owner",
] as const;

export type GuildRole =
  (typeof GUILD_ROLES)[number];

export type GuildProfileAccess = {
  approved?: boolean;
  role?: GuildRole | string;
};

export function isCentralGuildUser(
  user: Pick<User, "email"> | null
) {
  return (
    user?.email?.toLowerCase() ===
    CENTRAL_GUILD_EMAIL
  );
}

export function getEffectiveRole(
  user: Pick<User, "email"> | null,
  profile: GuildProfileAccess | null
): GuildRole {
  if (isCentralGuildUser(user)) {
    return "owner";
  }

  const role =
    profile?.role?.toLowerCase();

  if (
    role === "tech" ||
    role === "admin" ||
    role === "owner"
  ) {
    return role;
  }

  return "adventurer";
}

export function canAccessStaffPages(
  role: GuildRole
) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "tech"
  );
}

export function canAccessAdminPages(
  role: GuildRole
) {
  return (
    role === "owner" ||
    role === "admin"
  );
}
