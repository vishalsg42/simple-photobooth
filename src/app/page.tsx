import { PhotoBooth } from "@/components/PhotoBooth";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-10 overflow-hidden bg-transparent px-6 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(73,104,255,0.2),rgba(6,8,20,0.95))]" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -z-20 h-[120%] w-[140%] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(14,255,198,0.1),transparent_60%)] blur-3xl" />

      <header className="flex flex-col items-center gap-3 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-white/60">
          Photobooth
        </span>
      </header>

      <PhotoBooth />

      <p className="text-center text-xs text-white/40">
        Need to try again? Use Retake to return to the live preview.
      </p>
    </main>
  );
}
