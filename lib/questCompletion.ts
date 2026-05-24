import {
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

import { upsertPublicAdventurerProfile } from "./publicAdventurerProfile";

type QuestReport = {
  uid?: string;
  name?: string;
  text?: string;
  status?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reputationAward?: number;
};

type QuestReviewSource = {
  id: string;
  title?: string;
};

function latestSubmittedReportIndex(
  reports: QuestReport[],
  uid: string
) {
  for (
    let index = reports.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (
      reports[index].uid === uid &&
      String(
        reports[index].status ||
          "submitted"
      ).toLowerCase() === "submitted"
    ) {
      return index;
    }
  }

  return -1;
}

function getQuestStatusAfterReview(
  reports: QuestReport[],
  acceptedApplicantUids: string[]
) {
  const verifiedUids = new Set(
    reports
      .filter(
        (report) =>
          String(
            report.status || ""
          ).toLowerCase() === "verified" &&
          report.uid
      )
      .map((report) => report.uid)
  );

  const hasSubmittedReport =
    reports.some(
      (report) =>
        String(
          report.status || ""
        ).toLowerCase() === "submitted"
    );

  const allAcceptedVerified =
    acceptedApplicantUids.length > 0 &&
    acceptedApplicantUids.every((uid) =>
      verifiedUids.has(uid)
    );

  if (allAcceptedVerified) {
    return "completed";
  }

  if (hasSubmittedReport) {
    return "report_submitted";
  }

  return "in_progress";
}

export async function verifyQuestReportAndUpdateProfile(
  db: Firestore,
  quest: QuestReviewSource,
  reportUid: string,
  reputationAward: number
) {
  const cleanReputationAward = Math.max(
    0,
    Math.floor(
      Number(reputationAward) || 0
    )
  );

  if (!reportUid) {
    throw new Error(
      "Report adventurer is missing."
    );
  }

  let publicProfileData: any = null;

  await runTransaction(
    db,
    async (transaction) => {
      const questRef = doc(
        db,
        "questsv1",
        quest.id
      );
      const adventurerRef = doc(
        db,
        "adventurers",
        reportUid
      );
      const questSnap =
        await transaction.get(questRef);
      const adventurerSnap =
        await transaction.get(
          adventurerRef
        );

      if (!questSnap.exists()) {
        throw new Error(
          "Quest no longer exists."
        );
      }

      if (!adventurerSnap.exists()) {
        throw new Error(
          "Adventurer profile no longer exists."
        );
      }

      const questData =
        questSnap.data();
      const reports: QuestReport[] =
        Array.isArray(questData.reports)
          ? questData.reports
          : [];
      const reportIndex =
        latestSubmittedReportIndex(
          reports,
          reportUid
        );

      if (reportIndex < 0) {
        throw new Error(
          "No pending report found for this adventurer."
        );
      }

      const reviewedReport = {
        ...reports[reportIndex],
        status: "verified",
        reputationAward:
          cleanReputationAward,
        reviewedAt:
          new Date().toISOString(),
      };
      const nextReports = [
        ...reports,
      ];
      nextReports[reportIndex] =
        reviewedReport;

      const acceptedApplicantUids =
        Array.isArray(
          questData.acceptedApplicantUids
        )
          ? questData.acceptedApplicantUids
          : [];
      const adventurer =
        adventurerSnap.data();
      const questsCompleted =
        ((adventurer.questsCompleted as number) ||
          0) + 1;
      const reputation =
        ((adventurer.reputation as number) ||
          0) + cleanReputationAward;
      const completedQuestLog =
        Array.isArray(
          adventurer.completedQuestLog
        )
          ? adventurer.completedQuestLog
          : [];

      transaction.update(adventurerRef, {
        questsCompleted,
        reputation,
        completedQuestLog: [
          ...completedQuestLog,
          {
            questId: quest.id,
            title:
              quest.title ||
              questData.title ||
              "Completed quest",
            summary:
              reviewedReport.text || "",
            reputationAward:
              cleanReputationAward,
            completedAt:
              new Date().toISOString(),
          },
        ],
        updatedAt: serverTimestamp(),
      });

      transaction.update(questRef, {
        reports: nextReports,
        reportVerified: true,
        status:
          getQuestStatusAfterReview(
            nextReports,
            acceptedApplicantUids
          ),
        updatedAt:
          serverTimestamp(),
      });

      publicProfileData = {
        uid: reportUid,
        adventurerId:
          adventurer.adventurerId,
        name: adventurer.name,
        guildRank:
          adventurer.guildRank,
        specialization:
          adventurer.specialization,
        cityName:
          adventurer.cityName,
        publicTagline:
          adventurer.publicTagline,
        portfolioUrl:
          adventurer.portfolioUrl,
        skillsVerified:
          adventurer.skillsVerified,
        questsCompleted,
        reputation,
        approved:
          adventurer.approved,
      };
    }
  );

  await upsertPublicAdventurerProfile(
    db,
    reportUid,
    publicProfileData
  );
}

export async function rejectQuestReport(
  db: Firestore,
  quest: QuestReviewSource,
  reportUid: string
) {
  if (!reportUid) {
    throw new Error(
      "Report adventurer is missing."
    );
  }

  await runTransaction(
    db,
    async (transaction) => {
      const questRef = doc(
        db,
        "questsv1",
        quest.id
      );
      const questSnap =
        await transaction.get(questRef);

      if (!questSnap.exists()) {
        throw new Error(
          "Quest no longer exists."
        );
      }

      const questData =
        questSnap.data();
      const reports: QuestReport[] =
        Array.isArray(questData.reports)
          ? questData.reports
          : [];
      const reportIndex =
        latestSubmittedReportIndex(
          reports,
          reportUid
        );

      if (reportIndex < 0) {
        throw new Error(
          "No pending report found for this adventurer."
        );
      }

      const nextReports = [
        ...reports,
      ];
      nextReports[reportIndex] = {
        ...nextReports[reportIndex],
        status: "rejected",
        reviewedAt:
          new Date().toISOString(),
      };

      const acceptedApplicantUids =
        Array.isArray(
          questData.acceptedApplicantUids
        )
          ? questData.acceptedApplicantUids
          : [];

      transaction.update(questRef, {
        reports: nextReports,
        status:
          getQuestStatusAfterReview(
            nextReports,
            acceptedApplicantUids
          ),
        updatedAt:
          serverTimestamp(),
      });
    }
  );
}
