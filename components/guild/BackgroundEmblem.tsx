import Image from "next/image";

export default function BackgroundEmblem() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

      <Image
        src="/guild-logo.png"
        alt="Guild Background Emblem"
        width={1100}
        height={1100}
        priority
        className="
          opacity-[0.1]
          blur-[1px]
          scale-125
          select-none
          drop-shadow-[0_0_80px_rgba(212,164,75,0.15)]
        "
      />

    </div>
  );
}