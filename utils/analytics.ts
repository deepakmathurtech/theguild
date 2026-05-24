export type GuildEvent =
  | "landing_to_register"
  | "register_to_verification"
  | "verification_to_first_quest"
  | "quest_to_completion";

export function trackGuildEvent(
  event: GuildEvent,
  details: Record<string, string> = {}
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("guild:metric", {
      detail: {
        event,
        ...details,
      },
    })
  );

  console.log("Guild metric", {
    event,
    ...details,
  });
}
