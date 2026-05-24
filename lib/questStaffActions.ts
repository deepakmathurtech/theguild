import {
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

type QuestApplicant = {
  uid?: string;
  name?: string;
  email?: string;
  rank?: string;
  reputation?: number;
  avatar?: string;
};

export async function acceptQuestApplicant(
  db: Firestore,
  questId: string,
  applicant: QuestApplicant
) {
  if (!applicant.uid) {
    throw new Error(
      "Applicant profile is missing."
    );
  }

  const questRef = doc(
    db,
    "questsv1",
    questId
  );

  await runTransaction(
    db,
    async (transaction) => {
      const questSnap =
        await transaction.get(questRef);

      if (!questSnap.exists()) {
        throw new Error(
          "Quest no longer exists."
        );
      }

      const quest = questSnap.data();
      const acceptedApplicants =
        Array.isArray(
          quest.acceptedApplicants
        )
          ? quest.acceptedApplicants
          : [];
      const acceptedApplicantUids =
        Array.isArray(
          quest.acceptedApplicantUids
        )
          ? quest.acceptedApplicantUids
          : [];
      const maxAccepted =
        Number(quest.maxApplicants) || 1;

      if (
        acceptedApplicantUids.includes(
          applicant.uid
        )
      ) {
        throw new Error(
          "Applicant already accepted."
        );
      }

      if (
        acceptedApplicantUids.length >=
        maxAccepted
      ) {
        throw new Error(
          "Accepted applicant limit reached."
        );
      }

      const acceptedApplicant = {
        ...applicant,
        acceptedAt:
          new Date().toISOString(),
      };
      const nextAcceptedApplicants = [
        ...acceptedApplicants,
        acceptedApplicant,
      ];
      const nextAcceptedUids = [
        ...acceptedApplicantUids,
        applicant.uid,
      ];
      const isFull =
        nextAcceptedUids.length >=
        maxAccepted;

      transaction.update(questRef, {
        acceptedApplicants:
          nextAcceptedApplicants,
        acceptedApplicantUids:
          nextAcceptedUids,
        acceptedApplicantsCount:
          nextAcceptedUids.length,
        assignedTo:
          quest.assignedTo ||
          applicant.uid,
        assignedToName:
          quest.assignedToName ||
          applicant.name ||
          "Unknown",
        assignedAt:
          quest.assignedAt ||
          serverTimestamp(),
        status: isFull
          ? "in_progress"
          : "open",
        updatedAt:
          serverTimestamp(),
      });
    }
  );
}

export async function rejectQuestApplicant(
  db: Firestore,
  questId: string,
  applicant: QuestApplicant
) {
  if (!applicant.uid) {
    throw new Error(
      "Applicant profile is missing."
    );
  }

  const questRef = doc(
    db,
    "questsv1",
    questId
  );

  await runTransaction(
    db,
    async (transaction) => {
      const questSnap =
        await transaction.get(questRef);

      if (!questSnap.exists()) {
        throw new Error(
          "Quest no longer exists."
        );
      }

      const quest = questSnap.data();
      const acceptedApplicantUids =
        Array.isArray(
          quest.acceptedApplicantUids
        )
          ? quest.acceptedApplicantUids
          : [];

      if (
        acceptedApplicantUids.includes(
          applicant.uid
        )
      ) {
        throw new Error(
          "Accepted applicants cannot be rejected."
        );
      }

      const rejectedApplicantUids =
        Array.isArray(
          quest.rejectedApplicantUids
        )
          ? quest.rejectedApplicantUids
          : [];

      if (
        rejectedApplicantUids.includes(
          applicant.uid
        )
      ) {
        throw new Error(
          "Applicant already rejected."
        );
      }

      transaction.update(questRef, {
        rejectedApplicantUids: [
          ...rejectedApplicantUids,
          applicant.uid,
        ],
        updatedAt:
          serverTimestamp(),
      });
    }
  );
}
