"use client";

import QuestRegisterUI from "./QuestRegisterUI";

import {
  createQuest,
  validateQuestSubmission,
} from "./questBackend";

import {
  useGuildAuth,
} from "./GuildAuthLogic";

export default function QuestRegister() {

  const {
    user,
    guildProfile,
  } = useGuildAuth();

  async function handleQuestSubmit(
    data: any
  ) {

    // VALIDATE
    const validation =
      await validateQuestSubmission({
        user,
        guildProfile,
        data,
      });

    // BLOCK IF NOT ALLOWED
    if (!validation.allowed) {

      throw new Error(
        validation.message
      );
    }

    await createQuest({
      user,
      guildProfile,
      data,
    });
  }

  return (
    <QuestRegisterUI
      onSubmit={handleQuestSubmit}
    />
  );
}
