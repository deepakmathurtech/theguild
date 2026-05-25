import {
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";

type AdventurerIdInput = {
  cityName: string;
  cityCode: string;
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

function normalizeCityName(
  value: string
) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCityKey(
  value: string
) {
  return normalizeCityName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getRankCode(
  guildRank: string
) {
  return normalizeCode(
    guildRank,
    1
  );
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

  const requestedCityCode = normalizeCode(
    input.cityCode,
    3
  );

  const cityName = normalizeCityName(
    input.cityName
  );

  const cityKey = normalizeCityKey(
    cityName
  );

  if (!cityKey) {
    throw new Error(
      "Enter a valid city name."
    );
  }

  const genderCode =
    normalizeCode(
      input.genderCode,
      1
    );

  const rankCode = normalizeCode(
    input.rankCode,
    1
  );

  const cityRef = doc(
    db,
    "guildCities",
    cityKey
  );

  const generatedIdentity =
    await runTransaction(
      db,
      async (transaction) => {
        const citySnapshot =
          await transaction.get(cityRef);

        const cityCode =
          citySnapshot.exists()
            ? String(
                citySnapshot.data()
                  .cityCode ||
                  requestedCityCode
              )
            : requestedCityCode;

        const codeRef = doc(
          db,
          "guildCityCodes",
          cityCode
        );

        const codeSnapshot =
          await transaction.get(codeRef);

        if (
          codeSnapshot.exists() &&
          codeSnapshot.data().cityKey !==
            cityKey
        ) {
          throw new Error(
            "That city code is already assigned to another city."
          );
        }

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
          cityRef,
          {
            cityKey,
            cityName,
            cityCode,
            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        transaction.set(
          codeRef,
          {
            cityKey,
            cityName,
            cityCode,
            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );

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

        return {
          adventurerId: `TG-${cityCode}-${yearCode}${genderCode}${rankCode}-${String(
            nextSeries
          ).padStart(5, "0")}`,
          cityCode,
        };
      }
    );

  return {
    adventurerId:
      generatedIdentity.adventurerId,
    cityCode:
      generatedIdentity.cityCode,
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
    /^TG-([A-Z]{3})-(\d{2})([A-Z])([A-Z])-(\d{5})$/.exec(
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
