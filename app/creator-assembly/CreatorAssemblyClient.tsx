"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

import AmbientGlow from "@/components/guild/AmbientGlow";
import BackgroundEmblem from "@/components/guild/BackgroundEmblem";
import GuildNavbar from "@/components/guild/GuildNavbar";

// Define the countdown target: Sunday, May 31, 2026 at 6:00 PM IST (UTC+5:30)
const COUNTDOWN_TARGET = new Date("2026-05-31T18:00:00+05:30");

type Particle = {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
};

export default function CreatorAssemblyClient() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [creatorType, setCreatorType] = useState("");
  const [whatDoYouCreate, setWhatDoYouCreate] = useState("");
  const [whyDoYouJoin, setWhyDoYouJoin] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const registrationFormRef = useRef<HTMLDivElement>(null);

  // Initialize Particles and Countdown Timer client-side
  useEffect(() => {
    setMounted(true);

    // Generate random particles to avoid server/client hydration mismatch
    const generatedParticles = Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      delay: `${Math.random() * 6}s`,
      duration: `${Math.random() * 12 + 10}s`,
    }));
    setParticles(generatedParticles);

    // Countdown logic
    const updateCountdown = () => {
      const difference = +COUNTDOWN_TARGET - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Form Submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!name.trim() || !discordUsername.trim() || !creatorType || !whatDoYouCreate.trim() || !whyDoYouJoin.trim()) {
      setError("Please complete all registry details to enter the assembly.");
      return;
    }

    try {
      setSubmitting(true);

      // Save to Firebase Firestore under "creatorAssemblyRegistrations"
      await addDoc(collection(db, "creatorAssemblyRegistrations"), {
        name: name.trim(),
        discordUsername: discordUsername.trim(),
        creatorType: creatorType,
        whatDoYouCreate: whatDoYouCreate.trim(),
        whyDoYouJoin: whyDoYouJoin.trim(),
        registeredAt: new Date(),
        approved: false,
      });

      setSuccess(true);

      // Auto-redirect to Discord invite after 2.5 seconds
      setTimeout(() => {
        window.location.href = process.env.NEXT_PUBLIC_GUILD_DISCORD_INVITE || "https://discord.gg/tS9Me7aFT";
      }, 2500);

    } catch (err: any) {
      console.error("Firestore Registry Error:", err);
      // Fallback redirect if Firestore write fails (e.g. firestore rules / offline)
      setError("Entering the Assembly... Redirecting to Guild Hall.");
      setTimeout(() => {
        window.location.href = process.env.NEXT_PUBLIC_GUILD_DISCORD_INVITE || "https://discord.gg/tS9Me7aFT";
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToRegistration = () => {
    registrationFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToAbout = () => {
    const element = document.getElementById("about-assembly");
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const creatorCategories = [
    "Video Editors",
    "Graphic Designers",
    "Developers",
    "Writers",
    "YouTubers",
    "Streamers",
    "Artists",
    "AI Creators",
    "Music Creators",
    "Meme Creators"
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050505] text-white">
      {/* CSS CUSTOM ANIMATIONS */}
      <style jsx global>{`
        @keyframes float-particle {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.15;
          }
          50% {
            transform: translateY(-40px) translateX(20px);
            opacity: 0.5;
          }
        }
        @keyframes logo-glow {
          0%, 100% {
            filter: drop-shadow(0 0 20px rgba(212, 164, 75, 0.2)) blur(0.5px);
          }
          50% {
            filter: drop-shadow(0 0 45px rgba(212, 164, 75, 0.45)) blur(0.5px);
          }
        }
        @keyframes spin-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes card-sweep {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        .animate-logo-glow {
          animation: logo-glow 6s ease-in-out infinite;
        }
        .animate-spin-ring-slow {
          animation: spin-ring 32s linear infinite;
        }
        .animate-spin-ring-medium {
          animation: spin-ring 20s linear infinite reverse;
        }
        .particle-point {
          animation: float-particle 12s ease-in-out infinite;
        }
      `}</style>

      {/* FIXED ATMOSPHERE BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <AmbientGlow />
        <BackgroundEmblem />
        <div className="absolute inset-0 bg-black/75" />
        {/* Layered Golden Cinematic Lights */}
        <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-yellow-700/5 blur-[160px]" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[700px] w-[700px] rounded-full bg-yellow-600/5 blur-[200px]" />
        
        {/* Animated Particles */}
        {mounted && particles.map((p) => (
          <span
            key={p.id}
            className="particle-point absolute rounded-full bg-yellow-500/35 blur-[0.5px]"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* NAVBAR */}
      <div className="fixed left-0 top-0 z-50 w-full">
        <GuildNavbar />
      </div>

      {/* ==================== 1. HERO SECTION ==================== */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pt-32 pb-20 text-center sm:px-6 md:px-8">
        
        {/* Guild Logo Emblem */}
        <div className="relative mb-8 group">
          {/* Circular magical aura ring */}
          <div className="absolute top-1/2 left-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-500/10 animate-spin-ring-slow pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-yellow-700/5 animate-spin-ring-medium pointer-events-none" />
          
          <div className="absolute inset-0 rounded-full bg-yellow-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <Image
            src="/guild-logo.png"
            alt="The Central Guild Emblem"
            width={120}
            height={120}
            priority
            className="relative z-10 animate-logo-glow select-none group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Eyebrow */}
        <p className="text-[10px] tracking-[0.5em] text-yellow-600 sm:text-xs md:tracking-[0.7em] uppercase font-black drop-shadow-[0_0_8px_rgba(212,164,75,0.2)]">
          FOUNDING ERA INVITATION
        </p>

        {/* Main Title */}
        <h1 className="font-cinzel relative mt-6 text-4xl font-black tracking-[0.12em] text-yellow-400 sm:text-6xl md:text-7xl md:tracking-[0.25em] lg:text-8xl">
          GUILD CREATOR
          <br className="sm:hidden" />
          <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.08)]"> ASSEMBLY</span>
        </h1>

        {/* Subtitle */}
        <p className="font-cormorant relative mt-6 max-w-3xl text-xl italic leading-relaxed text-zinc-300 sm:text-2xl md:text-3xl md:tracking-[0.05em]">
          “Where creators gather, collaborate, and rise.”
        </p>

        {/* Category tags banner */}
        <div className="mt-8 flex flex-wrap justify-center items-center gap-x-3 gap-y-2 text-xs font-black tracking-[0.16em] text-zinc-500 max-w-2xl px-4 py-2 border-y border-yellow-950/20 bg-black/20 backdrop-blur-sm sm:text-sm">
          <span>EDITORS</span>
          <span className="text-yellow-600/40">•</span>
          <span>DESIGNERS</span>
          <span className="text-yellow-600/40">•</span>
          <span>DEVELOPERS</span>
          <span className="text-yellow-600/40">•</span>
          <span>WRITERS</span>
          <span className="text-yellow-600/40">•</span>
          <span>ARTISTS</span>
          <span className="text-yellow-600/40">•</span>
          <span>CREATORS</span>
        </div>

        {/* CTAs */}
        <div className="relative mt-12 grid w-full max-w-2xl gap-4 sm:grid-cols-2 px-4">
          <button
            onClick={scrollToRegistration}
            className="border-2 border-yellow-600 bg-yellow-500/10 px-8 py-5 text-[10px] font-black tracking-[0.3em] text-yellow-300 transition-all duration-300 hover:scale-[1.02] hover:bg-yellow-500 hover:text-black hover:shadow-[0_0_30px_rgba(212,164,75,0.3)] active:translate-y-px"
          >
            BECOME A FOUNDING CREATOR
          </button>

          <button
            onClick={scrollToAbout}
            className="border-2 border-zinc-800 bg-zinc-950/40 px-8 py-5 text-[10px] tracking-[0.3em] text-zinc-300 transition-all duration-300 hover:scale-[1.02] hover:border-yellow-600/60 hover:text-yellow-300 hover:bg-black/60 active:translate-y-px"
          >
            JOIN THE ASSEMBLY
          </button>
        </div>

        {/* Event Meta Small Info */}
        <div className="mt-14 flex flex-col items-center gap-2">
          <p className="text-[11px] font-semibold tracking-[0.35em] text-zinc-400 sm:text-xs">
            31ST MAY • SUNDAY • ONLINE EVENT
          </p>
          <div className="h-1 w-12 bg-yellow-600/30" />
        </div>

      </section>

      {/* ==================== 2. ABOUT SECTION ==================== */}
      <section id="about-assembly" className="relative z-10 mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        
        <div className="relative overflow-hidden rounded-[34px] border border-yellow-900/20 bg-black/40 p-8 backdrop-blur-xl sm:p-12 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          {/* Ambient inner glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.06),transparent_35%)] pointer-events-none" />
          
          <div className="relative z-10 text-center">
            <p className="text-[10px] tracking-[0.45em] text-yellow-600 uppercase font-black">
              CONVENING THE AMBITIOUS
            </p>
            
            <h2 className="font-cinzel mt-4 text-3xl font-black text-yellow-400 sm:text-4xl">
              A Gathering of Builders
            </h2>

            <div className="mt-8 space-y-6 text-base leading-relaxed text-zinc-400 font-sans sm:text-lg">
              <p>
                The <strong className="text-zinc-200">Guild Creator Assembly</strong> is not a passive webinar or a corporate networking mixer. It is a cinematic gathering designed for active builders, video editors, designers, developers, and writers who want to step out of isolation and create real influence.
              </p>
              <p>
                As part of this early cohort, you will connect directly with ambitious peers, collaborate on official guild projects, and unlock <strong className="text-yellow-400">Creator Quests</strong>—verified tasks that reward experience, reputation points, and place you in the founding rank files of the Guild ledger.
              </p>
              <p className="font-cormorant text-zinc-300 italic text-xl sm:text-2xl pt-2">
                “Individual skill is forged in isolation, but legends are built together.”
              </p>
            </div>
          </div>
        </div>

      </section>

      {/* ==================== 3. WHY JOIN SECTION ==================== */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8 border-t border-yellow-950/10">
        
        <div className="text-center mb-16">
          <p className="text-[10px] tracking-[0.45em] text-yellow-600 uppercase font-black">
            UNLOCKED PRIVILEGES
          </p>
          <h2 className="font-cinzel mt-4 text-3xl font-black text-yellow-400 sm:text-5xl">
            Why Stand with the Guild?
          </h2>
          <div className="mt-4 mx-auto h-[1px] w-24 bg-gradient-to-r from-transparent via-yellow-600/50 to-transparent" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* Card 1: Collaboration */}
          <div className="group relative overflow-hidden rounded-[26px] border border-yellow-900/10 bg-zinc-950/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-yellow-600/30 hover:bg-black/50 hover:shadow-[0_15px_40px_rgba(212,164,75,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.03),transparent_45%)]" />
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="font-cinzel text-lg font-bold text-yellow-300">Collaboration</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300">
                Co-create alongside like-minded motion editors, builders, and visual artists. No more solo grinds.
              </p>
            </div>
          </div>

          {/* Card 2: Creator Network */}
          <div className="group relative overflow-hidden rounded-[26px] border border-yellow-900/10 bg-zinc-950/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-yellow-600/30 hover:bg-black/50 hover:shadow-[0_15px_40px_rgba(212,164,75,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.03),transparent_45%)]" />
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0a9.003 9.003 0 018.716 6.747M12 3a9.003 9.003 0 00-8.716 6.747M3 12h18m-9-9v18" />
                </svg>
              </div>
              <h3 className="font-cinzel text-lg font-bold text-yellow-300">Creator Network</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300">
                Connect directly with the elite tier of local and remote creators, building lifelong professional alliances.
              </p>
            </div>
          </div>

          {/* Card 3: Recognition */}
          <div className="group relative overflow-hidden rounded-[26px] border border-yellow-900/10 bg-zinc-950/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-yellow-600/30 hover:bg-black/50 hover:shadow-[0_15px_40px_rgba(212,164,75,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.03),transparent_45%)]" />
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110 21a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0114 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <h3 className="font-cinzel text-lg font-bold text-yellow-300">Recognition</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300">
                Get your works certified and showcased on your public Guild Profile for clients and the assembly to verify.
              </p>
            </div>
          </div>

          {/* Card 4: Exclusive Quests */}
          <div className="group relative overflow-hidden rounded-[26px] border border-yellow-900/10 bg-zinc-950/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-yellow-600/30 hover:bg-black/50 hover:shadow-[0_15px_40px_rgba(212,164,75,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.03),transparent_45%)]" />
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                </svg>
              </div>
              <h3 className="font-cinzel text-lg font-bold text-yellow-300">Exclusive Quests</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300">
                Gain entry to high-reputation bounty quests and projects curated strictly for verified creators.
              </p>
            </div>
          </div>

          {/* Card 5: Founding Member Status */}
          <div className="group relative overflow-hidden rounded-[26px] border border-yellow-900/10 bg-zinc-950/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-yellow-600/30 hover:bg-black/50 hover:shadow-[0_15px_40px_rgba(212,164,75,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.03),transparent_45%)]" />
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="font-cinzel text-lg font-bold text-yellow-300">Founding Status</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300">
                Earn permanent pioneer status badges, unique Discord colors, and authority within the assembly directory.
              </p>
            </div>
          </div>

          {/* Card 6: Future Opportunities */}
          <div className="group relative overflow-hidden rounded-[26px] border border-yellow-900/10 bg-zinc-950/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-yellow-600/30 hover:bg-black/50 hover:shadow-[0_15px_40px_rgba(212,164,75,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,164,75,0.03),transparent_45%)]" />
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <h3 className="font-cinzel text-lg font-bold text-yellow-300">Future Opportunities</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300">
                Be first in line for future paid collaborations, server roles, and representation in commercial guild campaigns.
              </p>
            </div>
          </div>

        </div>

      </section>

      {/* ==================== 4. WHO SHOULD JOIN SECTION ==================== */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8 border-t border-yellow-950/10">
        
        <div className="text-center mb-16">
          <p className="text-[10px] tracking-[0.45em] text-yellow-600 uppercase font-black">
            ASSEMBLY ROSTER
          </p>
          <h2 className="font-cinzel mt-4 text-3xl font-black text-yellow-400 sm:text-5xl">
            Who Belongs in the Ranks?
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-sm text-zinc-500">
            Click on your path to focus your presence within the gathering.
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {creatorCategories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? null : category)}
                className={`relative px-4 py-6 border text-center transition-all duration-300 ${
                  isSelected 
                    ? "border-yellow-500 bg-yellow-500/10 text-yellow-300 shadow-[0_0_15px_rgba(212,164,75,0.15)]"
                    : "border-yellow-900/20 bg-zinc-950/20 text-zinc-400 hover:border-yellow-600/40 hover:text-zinc-200"
                }`}
                style={{
                  clipPath: "polygon(0 0, 90% 0, 100% 15%, 100% 100%, 10% 100%, 0 85%)"
                }}
              >
                <p className="text-xs font-black tracking-[0.16em] uppercase">
                  {category}
                </p>
                {isSelected && (
                  <span className="absolute top-1 right-2 text-[8px] text-yellow-500 font-bold">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Detail Text based on selected category path */}
        {selectedCategory && (
          <div className="mt-8 p-6 border border-yellow-800/30 bg-black/40 rounded-xl text-center max-w-2xl mx-auto animate-fade-in">
            <p className="text-xs text-yellow-500 tracking-wider uppercase font-black">THE PATH OF THE {selectedCategory.toUpperCase()}</p>
            <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
              {selectedCategory === "Video Editors" && "Harness cinematics, overlays, and rhythm. The guild requires motion wizards to forge trailers, community edits, and quest visual summaries."}
              {selectedCategory === "Graphic Designers" && "Create aesthetic key visuals, ranking charts, and guild flyers. Shape the face of the guild's external and internal documentation."}
              {selectedCategory === "Developers" && "Weave React, Next.js, and CSS. Help code custom UI interfaces, guild features, profiles, and interactive cards in our dev tracks."}
              {selectedCategory === "Writers" && "Author the lore archives, quest descriptions, guild announcements, and scripts. Keep the written record of our triumphs pristine."}
              {selectedCategory === "YouTubers" && "Broadcast our journey. Share the experience of completing quests, showcase rankings, and grow your channel alongside other creators."}
              {selectedCategory === "Streamers" && "Host live quest sessions, coding jams, and editing workshops. Bring community members together in real-time."}
              {selectedCategory === "Artists" && "Paint original digital art, character designs, and thematic avatars representing the classes, guilds, and legends."}
              {selectedCategory === "AI Creators" && "Utilize generative tools strategically to build concept mockups, text generation models, or visual assets for fast-moving drafts."}
              {selectedCategory === "Music Creators" && "Compose orchestrations, tavern beats, or background themes. Set the atmospheric tone for our landing pages and events."}
              {selectedCategory === "Meme Creators" && "Wield humor to build community culture. Generate viral media, highlight cards, and keep the tavern halls laughing."}
            </p>
          </div>
        )}

      </section>

      {/* ==================== 5. CREATOR QUESTS SECTION ==================== */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8 border-t border-yellow-950/10">
        
        <div className="text-center mb-16">
          <p className="text-[10px] tracking-[0.45em] text-yellow-600 uppercase font-black">
            RPG MISSION MODULES
          </p>
          <h2 className="font-cinzel mt-4 text-3xl font-black text-yellow-400 sm:text-5xl">
            Available Creator Quests
          </h2>
          <div className="mt-4 mx-auto h-[1px] w-24 bg-gradient-to-r from-transparent via-yellow-600/50 to-transparent" />
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* Quest 1 */}
          <div className="relative overflow-hidden border border-yellow-900/20 bg-zinc-950/40 p-6 backdrop-blur-md rounded-2xl flex flex-col justify-between h-96">
            <div className="absolute top-0 right-0 border-l border-b border-yellow-800/40 bg-yellow-500/10 px-3 py-1 text-[9px] tracking-widest text-yellow-300 font-bold uppercase">
              F-RANK
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-yellow-700 font-black">01 / CREATIVE DIRECTORY</p>
              <h3 className="font-cinzel text-xl text-yellow-400 mt-3">Guild Edit Quest</h3>
              <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                Forge a 60-second high-energy cinematic teaser representing The Central Guild. Wield your motion editing skills to drive recruitment.
              </p>
            </div>
            <div className="border-t border-yellow-950/30 pt-4 mt-6 flex justify-between items-center">
              <div>
                <p className="text-[8px] text-zinc-600 tracking-wider">REWARD</p>
                <p className="text-xs text-yellow-300 font-black tracking-wider">250 REP + RARE BADGE</p>
              </div>
              <span className="text-yellow-600/60 text-xs font-semibold">Active</span>
            </div>
          </div>

          {/* Quest 2 */}
          <div className="relative overflow-hidden border border-yellow-900/20 bg-zinc-950/40 p-6 backdrop-blur-md rounded-2xl flex flex-col justify-between h-96">
            <div className="absolute top-0 right-0 border-l border-b border-yellow-800/40 bg-yellow-500/10 px-3 py-1 text-[9px] tracking-widest text-yellow-300 font-bold uppercase">
              F-RANK
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-yellow-700 font-black">02 / OUTREACH CHAPTER</p>
              <h3 className="font-cinzel text-xl text-yellow-400 mt-3">Recruitment Quest</h3>
              <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                Rally 3 high-tier creators (editors, developers, or artists) to register their profile in the Guild archives before the assembly day.
              </p>
            </div>
            <div className="border-t border-yellow-950/30 pt-4 mt-6 flex justify-between items-center">
              <div>
                <p className="text-[8px] text-zinc-600 tracking-wider">REWARD</p>
                <p className="text-xs text-yellow-300 font-black tracking-wider">150 REP + GUILD TITLE</p>
              </div>
              <span className="text-yellow-600/60 text-xs font-semibold">Active</span>
            </div>
          </div>

          {/* Quest 3 */}
          <div className="relative overflow-hidden border border-yellow-900/20 bg-zinc-950/40 p-6 backdrop-blur-md rounded-2xl flex flex-col justify-between h-96">
            <div className="absolute top-0 right-0 border-l border-b border-yellow-800/40 bg-yellow-500/10 px-3 py-1 text-[9px] tracking-widest text-yellow-300 font-bold uppercase">
              F-RANK
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-yellow-700 font-black">03 / DESIGN FORGE</p>
              <h3 className="font-cinzel text-xl text-yellow-400 mt-3">Poster Forge</h3>
              <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                Design a key graphic poster representing the Assembly event. Ensure visual harmony using our dark fantasy black-and-gold grid aesthetic.
              </p>
            </div>
            <div className="border-t border-yellow-950/30 pt-4 mt-6 flex justify-between items-center">
              <div>
                <p className="text-[8px] text-zinc-600 tracking-wider">REWARD</p>
                <p className="text-xs text-yellow-300 font-black tracking-wider">120 REP + EMBLEM</p>
              </div>
              <span className="text-yellow-600/60 text-xs font-semibold">Active</span>
            </div>
          </div>

          {/* Quest 4 */}
          <div className="relative overflow-hidden border border-yellow-900/20 bg-zinc-950/40 p-6 backdrop-blur-md rounded-2xl flex flex-col justify-between h-96">
            <div className="absolute top-0 right-0 border-l border-b border-yellow-800/40 bg-yellow-500/10 px-3 py-1 text-[9px] tracking-widest text-yellow-300 font-bold uppercase">
              F-RANK
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-yellow-700 font-black">04 / ARCHIVES SCROLL</p>
              <h3 className="font-cinzel text-xl text-yellow-400 mt-3">Lore Builder</h3>
              <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                Draft the origin lore, community laws, and creator pledges for the new Founding Creators era. Structure it with rich medieval themes.
              </p>
            </div>
            <div className="border-t border-yellow-950/30 pt-4 mt-6 flex justify-between items-center">
              <div>
                <p className="text-[8px] text-zinc-600 tracking-wider">REWARD</p>
                <p className="text-xs text-yellow-300 font-black tracking-wider">200 REP + LORE SCROLL</p>
              </div>
              <span className="text-yellow-600/60 text-xs font-semibold">Active</span>
            </div>
          </div>

          {/* Quest 5 */}
          <div className="relative overflow-hidden border border-yellow-900/20 bg-zinc-950/40 p-6 backdrop-blur-md rounded-2xl flex flex-col justify-between h-96 sm:col-span-2 lg:col-span-1">
            <div className="absolute top-0 right-0 border-l border-b border-yellow-800/40 bg-yellow-500/10 px-3 py-1 text-[9px] tracking-widest text-yellow-300 font-bold uppercase">
              F-RANK
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-yellow-700 font-black">05 / SYSTEMS EXPANSION</p>
              <h3 className="font-cinzel text-xl text-yellow-400 mt-3">UI Enhancement Quest</h3>
              <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                Design and implement responsive layout components for the Guild ID card registry screens. Keep spacing clean, premium, and fully modular.
              </p>
            </div>
            <div className="border-t border-yellow-950/30 pt-4 mt-6 flex justify-between items-center">
              <div>
                <p className="text-[8px] text-zinc-600 tracking-wider">REWARD</p>
                <p className="text-xs text-yellow-300 font-black tracking-wider">400 REP + RARE ID BORDER</p>
              </div>
              <span className="text-yellow-600/60 text-xs font-semibold">Active</span>
            </div>
          </div>

        </div>

      </section>

      {/* ==================== 6. EVENT DETAILS SECTION ==================== */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8 border-t border-yellow-950/10">
        
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          
          {/* Details Card */}
          <div className="border border-yellow-900/20 bg-black/40 p-8 backdrop-blur-xl rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <p className="text-[10px] tracking-[0.45em] text-yellow-600 uppercase font-black">
              CONVERGENCE PARAMETERS
            </p>
            <h2 className="font-cinzel mt-4 text-3xl font-black text-yellow-400">
              Assembly Details
            </h2>

            <div className="mt-8 space-y-6">
              
              <div className="flex items-start gap-4">
                <div className="mt-1 text-yellow-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest text-zinc-500 uppercase">DATE & DAY</p>
                  <p className="text-lg text-zinc-200 font-semibold mt-1">31st May (Sunday)</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 text-yellow-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest text-zinc-500 uppercase">MODE</p>
                  <p className="text-lg text-zinc-200 font-semibold mt-1">Online Interactive Gathering</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 text-yellow-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest text-zinc-500 uppercase">PLATFORMS</p>
                  <p className="text-lg text-zinc-200 font-semibold mt-1">Discord Voice + Google Meet</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 text-yellow-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest text-zinc-500 uppercase">CAPACITY LIMIT</p>
                  <p className="text-lg text-yellow-400 font-black mt-1">100 Limited Early Spots Only</p>
                </div>
              </div>

            </div>
          </div>

          {/* Countdown Clock */}
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-[10px] tracking-[0.45em] text-yellow-700 uppercase font-black mb-6">
              TIME REMAINING UNTIL ASSEMBLY
            </p>
            
            <div className="grid grid-cols-4 gap-4 max-w-md w-full">
              
              {/* Days */}
              <div className="border border-yellow-900/20 bg-zinc-950/60 p-4 rounded-xl">
                <span className="font-cinzel text-3xl sm:text-5xl font-black text-yellow-400 block">{timeLeft.days}</span>
                <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase mt-2 block">DAYS</span>
              </div>

              {/* Hours */}
              <div className="border border-yellow-900/20 bg-zinc-950/60 p-4 rounded-xl">
                <span className="font-cinzel text-3xl sm:text-5xl font-black text-yellow-400 block">{timeLeft.hours}</span>
                <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase mt-2 block">HOURS</span>
              </div>

              {/* Minutes */}
              <div className="border border-yellow-900/20 bg-zinc-950/60 p-4 rounded-xl">
                <span className="font-cinzel text-3xl sm:text-5xl font-black text-yellow-400 block">{timeLeft.minutes}</span>
                <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase mt-2 block">MINS</span>
              </div>

              {/* Seconds */}
              <div className="border border-yellow-900/20 bg-zinc-950/60 p-4 rounded-xl">
                <span className="font-cinzel text-3xl sm:text-5xl font-black text-yellow-400 block">{timeLeft.seconds}</span>
                <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase mt-2 block">SECS</span>
              </div>

            </div>

            <p className="mt-8 text-xs text-zinc-500 italic">
              Once slots are filled, registration will close permanently.
            </p>
          </div>

        </div>

      </section>

      {/* ==================== 7. FOUNDING CREATORS SECTION ==================== */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8 border-t border-yellow-950/10 text-center">
        
        <p className="text-[10px] tracking-[0.45em] text-yellow-600 uppercase font-black">
          THE PIONEER CHARTER
        </p>
        <h2 className="font-cinzel mt-4 text-3xl font-black text-yellow-400 sm:text-5xl leading-tight">
          A Legacy Forged Early
        </h2>
        
        <div className="mt-8 max-w-2xl mx-auto space-y-6 text-zinc-400">
          <p className="text-lg leading-relaxed">
            The earliest members of any guild carry the heavy duty of shaping its culture. By entering the Creator Assembly as a <strong className="text-yellow-400">Founding Creator</strong>, your name is recorded in our early logs.
          </p>
          <p className="text-base">
            You will gain structural authority in the registry, priority access to high-tier quests, direct communication channels to the Guild Council, and recognition ranks that will remain permanently unique even as the Guild scale grows.
          </p>
        </div>

        <div className="mt-10 inline-flex items-center gap-2 border border-yellow-900/30 bg-yellow-500/5 px-6 py-3 rounded-full">
          <span className="h-2 w-2 rounded-full bg-yellow-500 animate-ping" />
          <span className="text-xs font-black tracking-widest text-yellow-300">SHAPE THE GUILD ECOSYSTEM</span>
        </div>

      </section>

      {/* ==================== 8. GALLERY / VISUAL PREVIEW SECTION ==================== */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8 border-t border-yellow-950/10">
        
        <div className="text-center mb-16">
          <p className="text-[10px] tracking-[0.45em] text-yellow-600 uppercase font-black">
            VISUAL REVELATIONS
          </p>
          <h2 className="font-cinzel mt-4 text-3xl font-black text-yellow-400 sm:text-5xl">
            Guild UI & Rank Showcase
          </h2>
          <div className="mt-4 mx-auto h-[1px] w-24 bg-gradient-to-r from-transparent via-yellow-600/50 to-transparent" />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Card Mockup Showcase (Interactive animated CSS card) */}
          <div className="lg:col-span-2 border border-yellow-900/20 bg-black/40 p-6 backdrop-blur-xl rounded-[28px] flex flex-col justify-between overflow-hidden relative shadow-[0_20px_55px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,164,75,0.04),transparent_55%)] pointer-events-none" />
            
            <div>
              <p className="text-[9px] tracking-widest text-yellow-700 font-black uppercase">TACTICAL PROFILE CARD</p>
              <h3 className="font-cinzel text-xl text-yellow-400 mt-2">Founding Guild ID Card</h3>
              <p className="text-xs text-zinc-500 mt-2">Every approved creator gains a verified digital identifier card.</p>
            </div>

            {/* Interactive Card Rendering */}
            <div className="my-8 flex justify-center items-center">
              <div 
                className="relative aspect-[1.58/1] w-full max-w-[420px] rounded-xl border border-yellow-500/20 bg-[#020202] p-5 overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.8)]"
                style={{
                  clipPath: "polygon(0% 8%, 8% 0%, 92% 0%, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%)"
                }}
              >
                {/* Shiny Sweep Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgba(212,164,75,0.06)_50%,transparent_70%)] animate-[card-sweep_5s_infinite_linear]" />
                
                {/* Logo watermark */}
                <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
                  <Image src="/guild-logo.png" alt="" width={150} height={150} />
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-cinzel text-[9px] font-semibold tracking-[0.4em] text-yellow-500/80">THE GUILD</p>
                    <p className="text-[7px] tracking-[0.2em] text-zinc-500 uppercase mt-1">FOUNDING CREATOR ASSEMBLY</p>
                  </div>
                  <div className="border border-yellow-700/30 bg-yellow-500/10 px-2 py-1 text-[8px] tracking-widest text-yellow-300">
                    F-RANK
                  </div>
                </div>

                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                  <div>
                    <p className="text-[8px] tracking-widest text-yellow-500/70">MEMBER ID</p>
                    <p className="font-cormorant text-xl italic text-zinc-200 mt-1">TG-CREATOR-2026</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[6px] tracking-widest text-zinc-600">VERIFICATION STAMP</p>
                    <p className="text-[8px] font-mono text-zinc-400 mt-1">APPROVED // OK</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-zinc-500 italic text-center">
              * Hover to reveal light sweeps and micro-metallic shine overlays.
            </div>
          </div>

          {/* Ranks and UI features */}
          <div className="space-y-6">
            
            {/* Rank Box */}
            <div className="border border-yellow-900/20 bg-black/40 p-6 backdrop-blur-xl rounded-2xl">
              <p className="text-[9px] tracking-widest text-yellow-700 font-black">RANK HIERARCHY</p>
              <h4 className="font-cinzel text-lg text-yellow-300 mt-2">Rank Progressions</h4>
              
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center text-xs p-2 border-b border-yellow-950/20">
                  <span className="text-zinc-400">F-Rank Founder</span>
                  <span className="text-yellow-400 font-bold">Assembly Core</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 border-b border-yellow-950/20">
                  <span className="text-zinc-400">F-Rank Editor</span>
                  <span className="text-yellow-500 font-bold">Verified Knight</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2">
                  <span className="text-zinc-400">F-Rank Builder</span>
                  <span className="text-zinc-500 font-bold">Adventurer</span>
                </div>
              </div>
            </div>

            {/* UI Preview Box */}
            <div className="border border-yellow-900/20 bg-black/40 p-6 backdrop-blur-xl rounded-2xl">
              <p className="text-[9px] tracking-widest text-yellow-700 font-black">LEDGER MODULE</p>
              <h4 className="font-cinzel text-lg text-yellow-300 mt-2">Quest Ledger UI</h4>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Tracks total contribution points, completed quests log, and verification status of every creator.
              </p>
              
              {/* Mini UI bar mock */}
              <div className="mt-4 p-3 bg-zinc-950/60 rounded border border-yellow-900/10">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-zinc-500">QUEST VERIFICATION</span>
                  <span className="text-emerald-500 font-bold">98% SUCCESS</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-yellow-500 h-full w-[98%]" />
                </div>
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* ==================== 9. REGISTRATION SECTION ==================== */}
      <section ref={registrationFormRef} className="relative z-10 mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8 border-t border-yellow-950/10">
        
        <div className="relative overflow-hidden rounded-[34px] border-2 border-yellow-600/50 bg-[#0d0905] p-8 sm:p-12 shadow-[0_45px_100px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,164,75,0.08),transparent_55%)] pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
          
          <div className="relative z-10">
            
            <div className="text-center border-b border-yellow-900/20 pb-6 mb-8">
              <p className="text-[10px] tracking-[0.45em] text-yellow-600 uppercase font-black">
                GUILD ASSEMBLY LEDGER
              </p>
              <h2 className="font-cinzel mt-4 text-3xl font-black text-yellow-400 sm:text-4xl">
                Enter the Assembly
              </h2>
              <p className="mt-3 text-sm text-zinc-500 leading-relaxed max-w-md mx-auto">
                Submit your credentials to reserve a founding seat. Once verified, your status becomes active.
              </p>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div role="alert" className="mb-6 border border-red-950 bg-red-950/30 p-4 rounded-xl text-sm text-red-400">
                {error}
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {success && (
              <div role="alert" className="mb-6 border border-emerald-950 bg-emerald-950/30 p-5 rounded-xl text-sm text-emerald-400 text-center">
                <p className="font-bold text-lg">APPLICATION RECORDED</p>
                <p className="mt-2 text-zinc-300">Welcome to the Founding Chapter. Opening the Discord Guild Hall...</p>
                <div className="mt-4 flex justify-center">
                  <span className="h-4 w-4 rounded-full bg-emerald-400 animate-ping" />
                </div>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-6">
              
              {/* NAME */}
              <div>
                <label htmlFor="reg-name" className="block text-[10px] tracking-[0.22em] text-zinc-500 uppercase font-black mb-2">
                  FULL NAME
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  disabled={submitting || success}
                  placeholder="e.g. Alistair Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-12 border border-yellow-900/30 bg-black/40 px-4 rounded-xl text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/30 transition-all duration-300"
                />
              </div>

              {/* DISCORD USERNAME */}
              <div>
                <label htmlFor="reg-discord" className="block text-[10px] tracking-[0.22em] text-zinc-500 uppercase font-black mb-2">
                  Phone Number 
                </label>
                <input
                  id="reg-discord"
                  type="text"
                  required
                  disabled={submitting || success}
                  placeholder="e.g. 1234567890"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  className="w-full min-h-12 border border-yellow-900/30 bg-black/40 px-4 rounded-xl text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/30 transition-all duration-300"
                />
              </div>

              {/* CREATOR TYPE */}
              <div>
                <label htmlFor="reg-creator-type" className="block text-[10px] tracking-[0.22em] text-zinc-500 uppercase font-black mb-2">
                  CREATOR TYPE
                </label>
                <select
                  id="reg-creator-type"
                  required
                  disabled={submitting || success}
                  value={creatorType}
                  onChange={(e) => setCreatorType(e.target.value)}
                  className="w-full min-h-12 border border-yellow-900/30 bg-black/40 px-4 rounded-xl text-zinc-300 outline-none focus:border-yellow-600 transition-all duration-300"
                >
                  <option value="" disabled className="bg-[#0d0905] text-zinc-600">Select your specialization</option>
                  <option value="Video Editor" className="bg-[#0d0905]">Video Editor</option>
                  <option value="Graphic Designer" className="bg-[#0d0905]">Graphic Designer</option>
                  <option value="Developer" className="bg-[#0d0905]">Developer</option>
                  <option value="Writer" className="bg-[#0d0905]">Writer</option>
                  <option value="YouTuber / Streamer" className="bg-[#0d0905]">YouTuber / Streamer</option>
                  <option value="Artist" className="bg-[#0d0905]">Artist</option>
                  <option value="AI Creator" className="bg-[#0d0905]">AI Creator</option>
                  <option value="Other" className="bg-[#0d0905]">Other Creator</option>
                </select>
              </div>

              {/* WHAT DO YOU CREATE? */}
              <div>
                <label htmlFor="reg-what" className="block text-[10px] tracking-[0.22em] text-zinc-500 uppercase font-black mb-2">
                  WHAT DO YOU CREATE?
                </label>
                <textarea
                  id="reg-what"
                  required
                  disabled={submitting || success}
                  placeholder="Describe your content format, creative tools, or code stacks you actively work with..."
                  value={whatDoYouCreate}
                  onChange={(e) => setWhatDoYouCreate(e.target.value)}
                  className="w-full min-h-24 resize-y border border-yellow-900/30 bg-black/40 p-4 rounded-xl text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/30 transition-all duration-300"
                />
              </div>

              {/* WHY DO YOU WANT TO JOIN? */}
              <div>
                <label htmlFor="reg-why" className="block text-[10px] tracking-[0.22em] text-zinc-500 uppercase font-black mb-2">
                  WHY DO YOU WANT TO JOIN?
                </label>
                <textarea
                  id="reg-why"
                  required
                  disabled={submitting || success}
                  placeholder="Explain what you want to achieve, co-create, or build inside the central guild..."
                  value={whyDoYouJoin}
                  onChange={(e) => setWhyDoYouJoin(e.target.value)}
                  className="w-full min-h-24 resize-y border border-yellow-900/30 bg-black/40 p-4 rounded-xl text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/30 transition-all duration-300"
                />
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || success}
                  className="w-full min-h-14 border-2 border-yellow-600 bg-yellow-500/10 text-[11px] font-black tracking-[0.3em] text-yellow-300 transition-all duration-300 hover:bg-yellow-500 hover:text-black hover:shadow-[0_0_25px_rgba(212,164,75,0.25)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "VERIFYING LOGS..." : "ENTER THE ASSEMBLY"}
                </button>
              </div>

            </form>

          </div>
        </div>

      </section>

      {/* ==================== 10. FINAL SECTION ==================== */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 py-32 sm:px-6 lg:px-8 text-center">
        
        <h2 className="font-cinzel text-4xl sm:text-6xl font-black text-yellow-400 tracking-[0.1em] uppercase">
          Build. Create.
          <br />
          Leave a Legacy.
        </h2>
        
        <p className="font-cormorant mt-6 text-xl italic leading-relaxed text-zinc-400 sm:text-2xl">
          “This is only the beginning.”
        </p>

        <div className="mt-12">
          <button
            onClick={scrollToRegistration}
            className="border-2 border-yellow-600 bg-yellow-500/15 px-10 py-5 text-[10px] font-black tracking-[0.3em] text-yellow-300 transition-all duration-300 hover:scale-105 hover:bg-yellow-500 hover:text-black hover:shadow-[0_0_35px_rgba(212,164,75,0.45)] active:translate-y-px"
          >
            BECOME A FOUNDING CREATOR
          </button>
        </div>

      </section>

      {/* FOOTER FADE */}
      <div className="pointer-events-none fixed bottom-0 left-0 z-40 h-28 w-full bg-gradient-to-t from-black via-black/40 to-transparent" />
    </main>
  );
}
