"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "@/lib/firebase";

import {
  type GuildRole,
} from "@/lib/guildAccess";

/* -------------------------------- */
/* TYPES */
/* -------------------------------- */

type GuildProfile = {
  adventurerId?: string;

  uid: string;

  name: string;

  email: string;

  guildRank: string;

  reputation: number;

  questsCompleted: number;

  specialization: string;

  contact: string;

  experience: string;

  cityName?: string;

  cityCode?: string;

  gender?: string;

  genderCode?: string;

  publicTagline?: string;

  skillsVerified?: string[];

  portfolioUrl?: string;

  verificationNotes?: string;

  completedQuestLog?: Array<{
    questId?: string;
    title: string;
    completedAt: string;
    summary?: string;
  }>;

  approved: boolean;

  avatar?: string;

  role?: GuildRole;
};

type GuildContextType = {

  user: User | null;

  guildProfile: GuildProfile | null;

  isAdventurer: boolean;

  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<User>;

  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<User>;

  logout: () => Promise<void>;
};

/* -------------------------------- */
/* CONTEXT */
/* -------------------------------- */

const GuildAuthContext =
  createContext<GuildContextType>({

    user: null,

    guildProfile: null,

    isAdventurer: false,

    loading: true,

    login: async () => {
      throw new Error(
        "GuildAuthProvider missing"
      );
    },

    register: async () => {
      throw new Error(
        "GuildAuthProvider missing"
      );
    },

    logout: async () => {},
  });

/* -------------------------------- */
/* PROVIDER */
/* -------------------------------- */

export function GuildAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [user, setUser] =
    useState<User | null>(null);

  const [guildProfile, setGuildProfile] =
    useState<GuildProfile | null>(null);

  const [isAdventurer, setIsAdventurer] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  /* -------------------------------- */
  /* LOGIN */
  /* -------------------------------- */

  async function login(
    email: string,
    password: string
  ): Promise<User> {

    console.log(
      "LOGIN FUNCTION START"
    );

    const result =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    console.log(
      "FIREBASE LOGIN SUCCESS:",
      result.user
    );

    return result.user;
  }

  /* -------------------------------- */
  /* REGISTER */
  /* -------------------------------- */

  async function register(
    name: string,
    email: string,
    password: string
  ): Promise<User> {

    console.log(
      "REGISTER FUNCTION START"
    );

    const result =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    console.log(
      "REGISTER SUCCESS:",
      result.user
    );

    /* UPDATE PROFILE */
    await updateProfile(
      result.user,
      {
        displayName: name,
      }
    );

    console.log(
      "AUTH USER CREATED"
    );

    return result.user;
  }

  /* -------------------------------- */
  /* LOGOUT */
  /* -------------------------------- */

  async function logout() {

    console.log(
      "LOGOUT START"
    );

    await signOut(auth);

    console.log(
      "LOGOUT SUCCESS"
    );
  }

  /* -------------------------------- */
  /* AUTH STATE */
  /* -------------------------------- */

  useEffect(() => {

    console.log(
      "AUTH LISTENER STARTED"
    );

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (
          firebaseUser
        ) => {

          console.log(
            "AUTH STATE CHANGED:",
            firebaseUser
          );

          try {

            /* NO USER */
            if (!firebaseUser) {

              console.log(
                "NO AUTH USER"
              );

              setUser(null);

              setGuildProfile(
                null
              );

              setIsAdventurer(
                false
              );

              setLoading(false);

              return;
            }

            /* USER EXISTS */
            console.log(
              "USER AUTHENTICATED:",
              firebaseUser.uid
            );

            setUser(
              firebaseUser
            );

            setGuildProfile(
              null
            );

            setIsAdventurer(
              false
            );

            try {

              console.log(
                "FETCHING PROFILE..."
              );

              const profileRef =
                doc(
                  db,
                  "adventurers",
                  firebaseUser.uid
                );

              const profileSnap =
                await getDoc(
                  profileRef
                );

              /* PROFILE EXISTS */
              if (
                profileSnap.exists()
              ) {

                console.log(
                  "PROFILE FOUND"
                );

                const data =
                  profileSnap.data() as GuildProfile;

                console.log(
                  "PROFILE DATA:",
                  data
                );

                setGuildProfile(
                  data
                );

                setIsAdventurer(
                  true
                );

              } else {

                console.log(
                  "NO PROFILE FOUND"
                );
              }

            } catch (
              profileError
            ) {

              console.log(
                "PROFILE FETCH FAILED:",
                profileError
              );
            }

          } catch (error) {

            console.log(
              "AUTH ERROR:",
              error
            );

          } finally {

            console.log(
              "AUTH LOADING COMPLETE"
            );

            setLoading(false);
          }
        }
      );

    return () => {

      console.log(
        "AUTH LISTENER CLEANUP"
      );

      unsubscribe();
    };

  }, []);

  /* -------------------------------- */
  /* PROVIDER */
  /* -------------------------------- */

  return (

    <GuildAuthContext.Provider
      value={{

        user,

        guildProfile,

        isAdventurer,

        loading,

        login,

        register,

        logout,
      }}
    >

      {children}

    </GuildAuthContext.Provider>
  );
}

/* -------------------------------- */
/* HOOK */
/* -------------------------------- */

export function useGuildAuth() {

  return useContext(
    GuildAuthContext
  );
}
