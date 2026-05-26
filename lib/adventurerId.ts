import {
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";

import { findGuildCity } from "@/lib/cities";

type AdventurerIdInput = {
  cityName: string;
  genderCode: string;
  rankCode: string;
  registeredAt?: Date;
};

function normalizeCode(
  value: string,
  length: number
) {
  return value
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, length)
    .padEnd(length, "X");
}

export function getRankCode(
  guildRank: string
) {
  return normalizeCode(
    guildRank,
    1
  );
}

export function getCityCode(
  cityName: string
) {
  return findGuildCity(cityName)?.code || "";
}

export async function generateAdventurerId(
  db: Firestore,
  input: AdventurerIdInput
) {
  const registeredAt =
    input.registeredAt || new Date();

  const yearCode =
    String(
      registeredAt.getFullYear()
    ).slice(-2);

  const city =
    findGuildCity(input.cityName);

  if (!city) {
    throw new Error(
      "Select a city from the Guild railway code list."
    );
  }

  const cityCode = city.code;

  const genderCode =
    normalizeCode(
      input.genderCode,
      1
    );

  const rankCode = normalizeCode(
    input.rankCode,
    1
  );

  const counterKey = [
    cityCode,
    yearCode,
    genderCode,
    rankCode,
  ].join("-");

  const counterRef = doc(
    db,
    "guildCounters",
    counterKey
  );

  const adventurerId =
    await runTransaction(
      db,
      async (transaction) => {
        const snapshot =
          await transaction.get(
            counterRef
          );

        const nextSeries =
          snapshot.exists()
            ? (snapshot.data()
                .lastSeries || 0) + 1
            : 1;

        transaction.set(
          counterRef,
          {
            cityCode,
            yearCode,
            genderCode,
            rankCode,
            lastSeries: nextSeries,
            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        return `TG-${cityCode}-${yearCode}${genderCode}${rankCode}-${String(
          nextSeries
        ).padStart(5, "0")}`;
      }
    );

  return {
    adventurerId,
    cityCode,
    genderCode,
    yearCode,
    rankCode,
  };
}

export async function backfillCounterRecord(
  db: Firestore,
  adventurerId: string
) {
  const match =
    /^TG-([A-Z0-9]{2,5})-(\d{2})([A-Z])([A-Z])-(\d{5})$/.exec(
      adventurerId
    );

  if (!match) {
    return;
  }

  const [
    ,
    cityCode,
    yearCode,
    genderCode,
    rankCode,
    series,
  ] = match;

  const counterRef = doc(
    db,
    "guildCounters",
    [
      cityCode,
      yearCode,
      genderCode,
      rankCode,
    ].join("-")
  );

  await setDoc(
    counterRef,
    {
      cityCode,
      yearCode,
      genderCode,
      rankCode,
      lastSeries: Number(series),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
