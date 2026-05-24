export const profileStatuses = [
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
] as const;

export const questStatuses = [
  "Accepted",
  "In Progress",
  "Submitted",
  "Verified",
  "Completed",
] as const;

export function readableStatus(
  status?: string
) {
  if (!status) {
    return "Open";
  }

  return status
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export function statusClass(
  status?: string
) {
  const normalized = String(status || "")
    .toLowerCase()
    .replace(/\s/g, "_");

  if (
    normalized.includes("approved") ||
    normalized.includes("verified") ||
    normalized.includes("completed")
  ) {
    return "border-emerald-700 bg-emerald-700/10 text-emerald-800";
  }

  if (
    normalized.includes("rejected") ||
    normalized.includes("expired")
  ) {
    return "border-red-700 bg-red-700/10 text-red-800";
  }

  if (
    normalized.includes("review") ||
    normalized.includes("submitted") ||
    normalized.includes("progress")
  ) {
    return "border-yellow-700 bg-yellow-700/10 text-yellow-800";
  }

  return "border-blue-700 bg-blue-700/10 text-blue-800";
}
