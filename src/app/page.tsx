import { PhotoBoothShell } from "@/components/PhotoBoothShell";

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col items-center justify-start gap-4 overflow-hidden bg-transparent px-4 py-4 text-white sm:gap-6 sm:px-6 sm:py-6 md:justify-center md:gap-10 md:py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(73,104,255,0.2),rgba(6,8,20,0.95))]" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -z-20 h-[120%] w-[140%] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(14,255,198,0.1),transparent_60%)] blur-3xl" />

      <header className="flex flex-col items-center gap-3 text-center">
      </header>

      <PhotoBoothShell />

      <p className="photobooth-bottom-note text-center text-xs text-white/40">
        Need to try again? Use Retake to return to the live preview.
      </p>
    </main>
  );
}
