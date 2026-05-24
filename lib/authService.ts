"use client";

import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export async function emailExists(
  email: string
) {
  const methods =
    await fetchSignInMethodsForEmail(
      auth,
      email.trim()
    );

  return methods.length > 0;
}

export async function loginWithEmail(
  email: string,
  password: string
) {
  const result =
    await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

  return result.user;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
) {
  const result =
    await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

  await updateProfile(result.user, {
    displayName: name.trim(),
  });

  return result.user;
}

export async function logoutFromGuild() {
  await signOut(auth);
}
