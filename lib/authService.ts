"use client";

import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

console.log("[AUTH] authService loaded");

export async function emailExists(
  email: string
) {
  console.log("[1] emailExists called");

  const methods =
    await fetchSignInMethodsForEmail(
      auth,
      email.trim()
    );

  console.log("[2] methods:", methods);

  return methods.length > 0;
}

export async function loginWithEmail(
  email: string,
  password: string
) {
  console.log("[3] login started");

  const result =
    await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

  console.log(
    "[4] login success:",
    result.user.email
  );

  return result.user;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
) {
  console.log("[5] register started");

  const result =
    await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

  console.log("[6] user created");

  await updateProfile(result.user, {
    displayName: name.trim(),
  });

  console.log("[7] profile updated");

  return result.user;
}

export async function sendGuildPasswordReset(
  email: string
) {
  try {
    console.log("[8] reset started");

    await sendPasswordResetEmail(
      auth,
      email.trim()
    );

    console.log("[9] reset email sent");
  } catch (err) {
    console.error(
      "[10] reset failed:",
      err
    );

    throw err;
  }
}

export async function logoutFromGuild() {
  try {
    console.log("[11] logout started");

    await signOut(auth);

    console.log("[12] logout success");
  } catch (err) {
    console.error(
      "[13] logout failed:",
      err
    );

    throw err;
  }
}