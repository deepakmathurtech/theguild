"use client";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export type GuildAnnouncement = {
  id: string;
  title: string;
  body: string;
  type: "general" | "ops" | "event";
  pinned: boolean;
  active: boolean;
  author: string;
  role: string;
  createdAt?: Timestamp;
};

export type GuildAnnouncementInput = {
  title: string;
  body: string;
  type: "general" | "ops" | "event";
  pinned?: boolean;
  active?: boolean;
  author: string;
  role: string;
};

export async function createAnnouncement(
  input: GuildAnnouncementInput
) {
  await addDoc(
    collection(db, "guildAnnouncements"),
    {
      ...input,
      pinned: Boolean(input.pinned),
      active:
        input.active === undefined
          ? true
          : input.active,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
}

export async function loadAnnouncements() {
  const announcementsQuery = query(
    collection(db, "guildAnnouncements"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(
    announcementsQuery
  );

  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as Omit<
      GuildAnnouncement,
      "id"
    >),
    id: docSnap.id,
  }));
}

export async function loadActiveAnnouncements() {
  const announcements =
    await loadAnnouncements();

  return announcements.filter(
    (announcement) =>
      announcement.active
  );
}

export async function updateAnnouncement(
  id: string,
  data: Partial<
    Omit<GuildAnnouncement, "id">
  >
) {
  await updateDoc(
    doc(db, "guildAnnouncements", id),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
}
