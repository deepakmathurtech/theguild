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
} from "firebase/auth";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import {
  auth,
  db,
} from "@/lib/firebase";

import {
  emailExists,
  loginWithEmail,
  logoutFromGuild,
  registerWithEmail,
} from "@/lib/authService";

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

  checkEmailExists: (
    email: string
  ) => Promise<boolean>;

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

    checkEmailExists: async () => false,

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

    return loginWithEmail(
      email,
      password
    );
  }

  async function checkEmailExists(
    email: string
  ) {
    return emailExists(email);
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

    return registerWithEmail(
      name,
      email,
      password
    );
  }

  /* -------------------------------- */
  /* LOGOUT */
  /* -------------------------------- */

  async function logout() {

    console.log(
      "LOGOUT START"
    );

    await logoutFromGuild();

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

    let profileUnsubscribe:
      | (() => void)
      | undefined;

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
              profileUnsubscribe?.();
              profileUnsubscribe =
                undefined;

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
                "WATCHING PROFILE..."
              );

              const profileRef =
                doc(
                  db,
                  "adventurers",
                  firebaseUser.uid
                );

              profileUnsubscribe?.();

              profileUnsubscribe =
                onSnapshot(
                  profileRef,
                  (profileSnap) => {
                    if (
                      profileSnap.exists()
                    ) {
                      const data =
                        profileSnap.data() as GuildProfile;

                      setGuildProfile(
                        data
                      );

                      setIsAdventurer(
                        true
                      );
                    } else {
                      setGuildProfile(
                        null
                      );

                      setIsAdventurer(
                        false
                      );
                    }

                    setLoading(false);
                  },
                  (profileError) => {
                    console.log(
                      "PROFILE WATCH FAILED:",
                      profileError
                    );

                    setLoading(false);
                  }
                );

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
          }
        }
      );

    return () => {

      console.log(
        "AUTH LISTENER CLEANUP"
      );

      profileUnsubscribe?.();

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

        checkEmailExists,

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
