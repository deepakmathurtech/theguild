"use client";

import { useState } from "react";

import Image from "next/image";

import {
  useGuildAuth,
} from "./GuildAuthLogic";

export default function GuildAuthForm() {

  const {
    login,
    register,
    user,
    guildProfile,
  } = useGuildAuth();

  const [isLogin, setIsLogin] =
    useState(true);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function handleAuth(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {

      setLoading(true);
      setMessage("");
      setError("");

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

      console.log(
        "AUTH STARTED"
      );

      console.log({
        isLogin,
        email,
        name,
      });

      console.log(
        "CURRENT USER BEFORE:",
        user
      );

      console.log(
        "CURRENT PROFILE BEFORE:",
        guildProfile
      );

      /* LOGIN */
      if (isLogin) {
        console.log(
          "TRYING LOGIN..."
        );

        const result =
          await login(
            normalizedEmail,
            password
          );

        console.log(
          "LOGIN SUCCESS:",
          result
        );

        console.log(
          "WAITING FOR AUTH STATE..."
        );

        setMessage(
          "Login successful. Opening the guild..."
        );

        setTimeout(() => {

          console.log(
            "REDIRECTING HOME..."
          );

          const nextUrl =
            new URLSearchParams(
              window.location.search
            ).get("next") || "/";

          window.location.href =
            nextUrl;

        }, 1500);

        return;
      }

      /* REGISTER */
      if (!name.trim()) {
        setError("Name is required.");
        return;
      }

      console.log(
        "TRYING REGISTER..."
      );

        const result =
        await register(
          name.trim(),
          normalizedEmail,
          password
        );

      console.log(
        "REGISTER SUCCESS:",
        result
      );

      console.log(
        "WAITING FOR PROFILE..."
      );

      setMessage(
        "Profile created. Continue your Guild registration..."
      );

      setTimeout(() => {

        console.log(
          "REDIRECTING REGISTER..."
        );

        window.location.href =
          "/register";

      }, 1500);

    } catch (error: any) {

      console.log(
        "AUTH ERROR:",
        error
      );

      console.log(
        "ERROR MESSAGE:",
        error?.message
      );

      if (
        error?.code ===
        "auth/email-already-in-use"
      ) {
        setIsLogin(true);
        setError(
          "Account already exists. Continue login."
        );
      } else if (
        error?.code === "auth/user-not-found"
      ) {
        setIsLogin(false);
        setError(
          "No account found. Create your Adventurer profile."
        );
      } else if (
        error?.code ===
        "auth/invalid-credential"
      ) {
        setError(
          "Invalid email or password."
        );
      } else {
        setError(
          error.message ||
            "Authentication failed."
        );
      }

    } finally {

      console.log(
        "AUTH FINISHED"
      );

      setLoading(false);

    }
  }

  return (
    <section
      className="
        relative
        flex
        min-h-[calc(100vh-120px)]
        items-center
        justify-center
          px-3
          py-8
          sm:px-6
          sm:py-12
      "
    >

      {/* Paper */}
      <div
        className="
          relative
          w-full
          max-w-2xl
          rotate-0
          overflow-hidden
          border-[5px]
          border-[#c9ae7b]
          bg-[#e8d8b4]
          p-4
          text-black
          shadow-[0_35px_120px_rgba(0,0,0,0.7)]
          sm:rotate-0
          sm:p-8
          md:rotate-[-1deg]
          md:p-10
        "
      >

        {/* Texture */}
        <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/old-wall.png')]" />

        {/* Aging */}
        <div className="absolute inset-0 bg-black/[0.03]" />

        {/* Ink */}
        <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-[#8b5e34]/[0.05] blur-3xl" />

        <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-black/[0.04] blur-3xl" />

        {/* Pins */}
        <div className="absolute left-5 top-5 h-4 w-4 rounded-full bg-[#6d4c1c]" />

        <div className="absolute right-5 top-5 h-4 w-4 rounded-full bg-[#6d4c1c]" />

        {/* Stamp */}
        <div
          className="
            absolute
            right-4
            top-4
            rotate-[16deg]
            opacity-70
            mix-blend-multiply
            sm:right-8
            sm:top-8
          "
        >

          <Image
            src="/stamp.png"
            alt="Guild Stamp"
            width={100}
            height={100}
            className="
              select-none
              sm:h-[120px]
              sm:w-[120px]
            "
          />

        </div>

        {/* Watermark */}
        <div
          className="
            absolute
            bottom-0
            right-2
            text-[90px]
            font-black
            text-black/[0.04]
            sm:right-6
            sm:text-[140px]
          "
        >
          ⚔
        </div>

        {/* Content */}
        <div className="relative z-10">

          {/* Header */}
          <div className="border-b border-black/10 pb-6">

            <p
              className="
                text-[9px]
                tracking-[0.35em]
                text-[#6a4b32]
                sm:text-[10px]
                sm:tracking-[0.45em]
              "
            >
              GUILD AUTHORIZATION
            </p>

            <h1
              className="
                font-cinzel
                mt-3
                text-2xl
                font-semibold
                tracking-[0.02em]
                text-[#24160d]
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
                leading-relaxed
                text-[#5a4633]
                sm:text-base
              "
            >
              {isLogin
                ? "Enter the guild archives and continue your journey."
                : "Register yourself within the guild records and begin your rise."}
            </p>

          </div>

          {/* Form */}
          {(error || message) && (
            <div
              className={`
                mt-6
                border
                px-5
                py-4
                text-sm
                ${
                  error
                    ? "border-red-500/30 bg-red-500/10 text-red-700"
                    : "border-emerald-700/30 bg-emerald-700/10 text-emerald-800"
                }
              `}
            >
              {error || message}
            </div>
          )}

          <form
            onSubmit={handleAuth}
            className="mt-6 space-y-6 sm:mt-8 sm:space-y-8"
          >

            {/* NAME */}
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

            {/* EMAIL */}
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

            {/* PASSWORD */}
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
                disabled={loading}
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
                {loading
                  ? "PROCESSING..."
                  : isLogin
                  ? "ENTER GUILD"
                  : "REGISTER"}
              </button>

            </div>

          </form>

        </div>

      </div>

    </section>
  );
}
