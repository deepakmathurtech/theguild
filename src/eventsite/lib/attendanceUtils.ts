export function normalizePublicProfileUrl(value: string | null | undefined) {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const pathname = url.pathname.replace(/\/+$/, '');
      return pathname || null;
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith('/')) {
    return trimmed.replace(/\/+$/, '');
  }

  if (trimmed.startsWith('member/') || trimmed.startsWith('g/')) {
    return `/${trimmed}`;
  }

  return null;
}

export function extractProfileUrlFromScanValue(value: string | null | undefined) {
  if (!value || typeof value !== 'string') return null;

  // Fast-path: already looks like a profile URL/path
  const normalized = normalizePublicProfileUrl(value);
  if (normalized) return normalized;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Typical "passport QR" payload: full URL like:
  // https://www.thecentralguild.quest/g/<guildId>
  const match = trimmed.match(
    /(?:https?:\/\/[^\s]+)?\/(member\/[^\s/?#]+|g\/[^\s/?#]+)/i
  );

  if (!match?.[1]) return null;

  return normalizePublicProfileUrl(`/${match[1]}`);
}

