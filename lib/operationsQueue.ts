export type QuestQueueFilter =
  | "attention"
  | "verification"
  | "reports"
  | "applicants"
  | "open"
  | "closed"
  | "all";

export type OperationsQuest = {
  title?: string;
  status?: string;
  verified?: boolean;
  questType?: string;
  location?: string;
  creatorName?: string;
  applicants?: unknown[];
  acceptedApplicantUids?: string[];
  rejectedApplicantUids?: string[];
  reports?: Array<{
    status?: string;
  }>;
};

function normalizedStatus(
  value?: string
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function applicantUid(
  applicant: unknown
) {
  if (
    typeof applicant !== "object" ||
    !applicant
  ) {
    return "";
  }

  return String(
    (applicant as { uid?: string }).uid ||
      ""
  );
}

export function pendingReportCount(
  quest: OperationsQuest
) {
  return (
    quest.reports?.filter(
      (report) =>
        normalizedStatus(report.status) ===
        "submitted"
    ).length || 0
  );
}

export function pendingApplicantCount(
  quest: OperationsQuest
) {
  const accepted =
    quest.acceptedApplicantUids || [];
  const rejected =
    quest.rejectedApplicantUids || [];

  return (
    quest.applicants?.filter(
      (applicant) => {
        const uid = applicantUid(applicant);

        return (
          !uid ||
          (!accepted.includes(uid) &&
            !rejected.includes(uid))
        );
      }
    ).length || 0
  );
}

export function needsQuestVerification(
  quest: OperationsQuest
) {
  return (
    !quest.verified ||
    normalizedStatus(quest.status) ===
      "pending_review"
  );
}

export function questNeedsAttention(
  quest: OperationsQuest
) {
  return (
    needsQuestVerification(quest) ||
    pendingReportCount(quest) > 0 ||
    pendingApplicantCount(quest) > 0
  );
}

export function questMatchesFilter(
  quest: OperationsQuest,
  filter: QuestQueueFilter
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "attention") {
    return questNeedsAttention(quest);
  }

  if (filter === "verification") {
    return needsQuestVerification(quest);
  }

  if (filter === "reports") {
    return pendingReportCount(quest) > 0;
  }

  if (filter === "applicants") {
    return pendingApplicantCount(quest) > 0;
  }

  return (
    normalizedStatus(quest.status) ===
    filter
  );
}

export function questMatchesSearch(
  quest: OperationsQuest,
  search: string
) {
  const query = search
    .trim()
    .toLowerCase();

  if (!query) {
    return true;
  }

  return [
    quest.title,
    quest.questType,
    quest.location,
    quest.creatorName,
    quest.status,
  ].some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(query)
  );
}

export function prioritySort<
  Quest extends OperationsQuest
>(quests: Quest[]) {
  return [...quests].sort(
    (first, second) => {
      const firstPriority =
        Number(
          needsQuestVerification(first)
        ) *
          100 +
        pendingReportCount(first) * 10 +
        pendingApplicantCount(first);
      const secondPriority =
        Number(
          needsQuestVerification(second)
        ) *
          100 +
        pendingReportCount(second) * 10 +
        pendingApplicantCount(second);

      return (
        secondPriority - firstPriority
      );
    }
  );
}

export function questQueueStats(
  quests: OperationsQuest[]
) {
  return {
    attention: quests.filter(
      questNeedsAttention
    ).length,
    verification: quests.filter(
      needsQuestVerification
    ).length,
    reports: quests.reduce(
      (total, quest) =>
        total + pendingReportCount(quest),
      0
    ),
    applicants: quests.reduce(
      (total, quest) =>
        total + pendingApplicantCount(quest),
      0
    ),
  };
}
