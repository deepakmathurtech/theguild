type GuildIdentitySource = {
  uid?: string;
  id?: string;
  adventurerId?: string;
  guildId?: string;
};

const ORIGINAL_GUILD_ID_PATTERN = /^TG-(?:[A-Z0-9]{2}-[A-Z0-9]{2,3}-)?[A-Z0-9]{2,5}-\d{2}[A-Z][A-Z]-\d{5}$/;

export function isOriginalGuildId(value: string) {
  return ORIGINAL_GUILD_ID_PATTERN.test(value.trim().toUpperCase());
}

export function getPublicGuildId(source: GuildIdentitySource) {
  return source.adventurerId || source.guildId || source.uid || source.id || '';
}

export function getPublicGuildProfilePath(source: GuildIdentitySource) {
  const guildId = getPublicGuildId(source);
  return guildId ? `/g/${encodeURIComponent(guildId)}` : '';
}

export function getPublicGuildProfileUrl(source: GuildIdentitySource) {
  const path = getPublicGuildProfilePath(source);
  if (!path) return '';
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

