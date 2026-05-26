import cityRecords from "@/content/cities.json";

export type GuildCity = {
  name: string;
  code: string;
};

function cityKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function loadGuildCities() {
  const names = new Map<string, string>();
  const codes = new Map<string, string>();

  return cityRecords.map((record) => {
    const name = String(record.name || "")
      .trim()
      .replace(/\s+/g, " ");
    const code = String(record.code || "")
      .trim()
      .toUpperCase();
    const key = cityKey(name);

    if (!name || !/^[A-Z0-9]{2,5}$/.test(code)) {
      throw new Error(
        `Invalid city entry in content/cities.json: ${name || "Unnamed city"}.`
      );
    }

    const previousCode = names.get(key);
    if (previousCode) {
      throw new Error(
        `City "${name}" is listed more than once in content/cities.json.`
      );
    }

    const previousName = codes.get(code);
    if (previousName && cityKey(previousName) !== key) {
      throw new Error(
        `Railway code "${code}" is assigned to more than one city in content/cities.json.`
      );
    }

    names.set(key, code);
    codes.set(code, name);

    return {
      name,
      code,
    };
  });
}

export const guildCities: GuildCity[] = loadGuildCities();

export function findGuildCity(
  cityName: string
) {
  const key = cityKey(cityName);

  return guildCities.find(
    (city) => cityKey(city.name) === key
  );
}
