"use client";

import { useEffect, useState } from "react";
import { PhotoBooth } from "./PhotoBooth";

export function PhotoBoothShell() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="photobooth-layout flex w-full max-w-4xl flex-1 flex-col items-center gap-6">
        <div className="h-5 w-48 animate-pulse rounded-full bg-white/10" />
        <div className="photobooth-stage">
          <div className="aspect-video w-full animate-pulse rounded-[2.5rem] bg-white/5" />
        </div>
        <div className="photobooth-actions flex w-full justify-center gap-4">
          <div className="h-11 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="h-11 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="h-11 w-28 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  return <PhotoBooth />;
}

export default PhotoBoothShell;

