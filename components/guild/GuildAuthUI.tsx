"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { useRouter } from "next/navigation";

import { useGuildAuth } from "./GuildAuthLogic";
import { trackGuildEvent } from "@/utils/analytics";

export default function GuildAuthUI() {

  const router = useRouter();

  const [isLogin, setIsLogin] =
    useState(true);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const {
    login,
    register,
  } = useGuildAuth();

  const [processing, setProcessing] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {

      setProcessing(true);

      setError("");
      setSuccess("");

      const normalizedEmail =
        email.trim();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          normalizedEmail
        )
      ) {
        setError(
          "Enter a valid email address."
        );
        return;
      }

      if (password.length < 6) {
        setError(
          "Password must be at least 6 characters."
        );
        return;
      }

      if (!isLogin && !name.trim()) {
        setError(
          "Name is required."
        );
        return;
      }

      console.log(
        "AUTH STARTED"
      );

      console.log({
        isLogin,
        email,
        name,
      });

      /* LOGIN */
      if (isLogin) {
        console.log(
          "TRY LOGIN"
        );

        const user =
          await login(
            normalizedEmail,
            password
          );

        console.log(
          "LOGIN SUCCESS:",
          user
        );

        setSuccess(
          "Login successful. Opening the quest board..."
        );

        setTimeout(() => {

          router.refresh();

          router.push(
            "/quests"
          );

        }, 1200);

        return;
      }

      /* REGISTER */
      console.log(
        "TRY REGISTER"
      );

      const user =
        await register(
          name.trim(),
          normalizedEmail,
          password
        );

      console.log(
        "REGISTER SUCCESS:",
        user
      );

      setSuccess(
        "Profile created. Continue your Guild registration..."
      );

      trackGuildEvent(
        "register_to_verification"
      );

      setTimeout(() => {

        router.refresh();

        router.push(
          "/register"
        );

      }, 1200);

    } catch (error: any) {

      console.log(
        "FULL ERROR:",
        error
      );

      console.log(
        "ERROR CODE:",
        error?.code
      );

      console.log(
        "ERROR MESSAGE:",
        error?.message
      );

      switch (error?.code) {

        case "auth/user-not-found":

          setIsLogin(false);

          setError(
            "No account found. Create your Adventurer profile."
          );

          break;

        case "auth/wrong-password":

          setError(
            "Incorrect password."
          );

          break;

        case "auth/invalid-credential":

          setError(
            "Invalid email or password."
          );

          break;

        case "auth/email-already-in-use":

          setIsLogin(true);

          setError(
            "Account already exists. Continue login."
          );

          break;

        case "auth/invalid-email":

          setError(
            "Enter a valid email address."
          );

          break;

        case "auth/weak-password":

          setError(
            "Password must be at least 6 characters."
          );

          break;

        case "auth/network-request-failed":

          setError(
            "Network connection failed."
          );

          break;

        default:

          console.log(
            "UNKNOWN FIREBASE ERROR:",
            error
          );

          setError(
            error?.message ||
            "Authentication failed."
          );
      }

    } finally {

      console.log(
        "AUTH FINISHED"
      );

      setProcessing(false);

    }
  }

  return (
    <main
      className="
        relative
        flex
        min-h-dvh
        items-center
        justify-center
        overflow-x-hidden
        bg-[#120d08]
        px-3
        py-24
        text-white
        sm:px-4
        sm:py-20
      "
    >

      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,164,75,0.12),transparent_55%)]" />

      {/* Emblem */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          flex
          items-center
          justify-center
        "
      >

        <Image
          src="/guild-logo.png"
          alt="Guild Emblem"
          width={700}
          height={700}
          priority
          className="
            w-[120vw]
            max-w-[700px]
            scale-110
            opacity-[0.06]
            blur-[1px]
          "
        />

      </div>

      {/* Paper */}
      <section
        className="
          relative
          z-10
          w-full
          max-w-2xl
          rotate-0
          overflow-hidden
          border-[5px]
          border-[#c9ae7b]
          bg-[#e8d8b4]
          p-4
          text-[#1d120a]
          shadow-[0_35px_120px_rgba(0,0,0,0.7)]
          sm:rotate-0
          sm:p-8
          md:rotate-[-1deg]
          md:p-12
        "
      >

        {/* Texture */}
        <div className="absolute inset-0 bg-black/[0.03]" />

        {/* Stamp */}
        <div
          className="
            absolute
            right-3
            top-3
            rotate-[12deg]
            opacity-60
            mix-blend-multiply
            sm:right-4
            sm:top-4
            sm:rotate-[18deg]
            sm:opacity-70
          "
        >

          <Image
            src="/stamp.png"
            alt="Guild Stamp"
            width={92}
            height={92}
            className="sm:h-[120px] sm:w-[120px]"
          />

        </div>

        {/* Pins */}
        <div className="absolute left-5 top-5 h-4 w-4 rounded-full bg-[#6d4c1c]" />

        <div className="absolute right-5 top-5 h-4 w-4 rounded-full bg-[#6d4c1c]" />

        {/* Header */}
        <div className="relative z-10">

          <p
            className="
              text-[9px]
              tracking-[0.28em]
              text-[#6a4b32]
              sm:text-[10px]
              sm:tracking-[0.45em]
            "
          >
            GUILD AUTHORIZATION
          </p>

          <h1
            className="
              mt-4
              max-w-[12rem]
              text-2xl
              font-black
              tracking-[0.02em]
              sm:max-w-none
              sm:text-4xl
              md:text-5xl
            "
          >
          {isLogin
            ? "Guild Login"
            : "Guild Registration"}
          </h1>

          <p
            className="
              mt-4
              text-sm
              italic
              text-[#5f4a37]
              sm:text-base
            "
          >
            {isLogin
              ? "Enter the guild archives and continue your journey."
              : "Register yourself within the guild records and begin your rise."}
          </p>

        </div>

        {/* Error */}
        {error && (

          <div
            className="
              relative
              z-10
              mt-8
              border
              border-red-500/30
              bg-red-500/10
              px-5
              py-4
              text-sm
              text-red-700
            "
          >
            {error}
          </div>

        )}

        {success && (

          <div
            className="
              relative
              z-10
              mt-8
              border
              border-emerald-700/30
              bg-emerald-700/10
              px-5
              py-4
              text-sm
              text-emerald-800
            "
          >
            {success}
          </div>

        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="
            relative
            z-10
            mt-7
            space-y-6
            sm:mt-10
            sm:space-y-8
          "
        >

          {/* Name */}
          {!isLogin && (

            <div>

              <label
                className="
                  text-[10px]
                  tracking-[0.3em]
                  text-[#6a4b32]
                "
              >
                NAME
              </label>

              <input
                type="text"
                value={name}
                required={!isLogin}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                className="
                  mt-3
                  w-full
                  min-h-12
                  border-b
                  border-black/20
                  bg-transparent
                  pb-3
                  text-base
                  italic
                  outline-none
                  sm:text-2xl
                  md:text-3xl
                "
              />

            </div>

          )}

          {/* Email */}
          <div>

            <label
              className="
                text-[10px]
                tracking-[0.3em]
                text-[#6a4b32]
              "
            >
              EMAIL
            </label>

            <input
              type="email"
              value={email}
              required
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              className="
                mt-3
                w-full
                min-h-12
                border-b
                border-black/20
                bg-transparent
                pb-3
                text-base
                italic
                outline-none
                sm:text-2xl
                md:text-3xl
              "
            />

          </div>

          {/* Password */}
          <div>

            <label
              className="
                text-[10px]
                tracking-[0.3em]
                text-[#6a4b32]
              "
            >
              PASSWORD
            </label>

            <input
              type="password"
              value={password}
              required
              minLength={6}
              aria-describedby="password-requirements"
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              className="
                mt-3
                w-full
                min-h-12
                border-b
                border-black/20
                bg-transparent
                pb-3
                text-base
                italic
                outline-none
                sm:text-2xl
                md:text-3xl
              "
            />

            <p
              id="password-requirements"
              className="mt-2 text-xs text-[#6a4b32]"
            >
              Minimum 6 characters.
            </p>

          </div>

          {/* Footer */}
          <div
            className="
              flex
              flex-col
              gap-5
              border-t
              border-black/10
              pt-8
              md:flex-row
              md:items-center
              md:justify-between
            "
          >

            <button
              type="button"
              onClick={() =>
                setIsLogin(
                  !isLogin
                )
              }
              className="
                text-left
                text-[10px]
                tracking-[0.16em]
                text-[#6a4b32]
                transition
                hover:opacity-70
                sm:tracking-[0.25em]
              "
            >
              {isLogin
                ? "REGISTER"
                : "ALREADY REGISTERED?"}
            </button>

            <button
              type="submit"
              disabled={processing}
              className="
                w-full
                min-h-12
                border-[3px]
                border-[#6d4c1c]
                bg-[#24160d]
                px-5
                py-4
                text-[10px]
                font-black
                tracking-[0.18em]
                text-[#e8d8b4]
                transition
                hover:bg-[#3b2414]
                disabled:opacity-70
                md:w-auto
                sm:px-8
                sm:tracking-[0.3em]
              "
            >
              {processing
                ? "PROCESSING..."
                : isLogin
                ? "ENTER GUILD"
                : "REGISTER"}
            </button>

          </div>

        </form>

        <p
          className="
            relative
            z-10
            mt-7
            text-xs
            leading-6
            text-[#6a4b32]
          "
        >
          By entering The Guild, you agree to the{" "}
          <Link
            href="/terms"
            className="font-black underline decoration-black/30 underline-offset-4"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-black underline decoration-black/30 underline-offset-4"
          >
            Privacy Policy
          </Link>
          . System notes live in the{" "}
          <Link
            href="/technical"
            className="font-black underline decoration-black/30 underline-offset-4"
          >
            technical ledger
          </Link>
          .
        </p>

      </section>

    </main>
  );
}
