"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    width: { ideal: 1600 },
    height: { ideal: 900 },
    facingMode: "user",
  },
};

type CaptureState = "preview" | "captured" | "error";

const DEFAULT_CAMERA_ERROR_MESSAGE =
  "We couldn't start your camera. Please allow camera access in your browser settings and try again.";

const getCameraErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
      case "PermissionDeniedError":
        return "Camera access was denied. Please grant camera permission in your browser and try again.";
      case "NotFoundError":
      case "OverconstrainedError":
        return "No usable camera was detected. Connect a camera and try again.";
      default:
        return DEFAULT_CAMERA_ERROR_MESSAGE;
    }
  }

  if (error instanceof Error) {
    return error.message || DEFAULT_CAMERA_ERROR_MESSAGE;
  }

  return DEFAULT_CAMERA_ERROR_MESSAGE;
};

export function PhotoBooth() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(false);
  const permissionStateRef = useRef<PermissionState | null>(null);

  const [state, setState] = useState<CaptureState>("preview");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.pause();
      videoElement.srcObject = null;
    }
  }, []);

  const queryCameraPermission = useCallback(async () => {
    if (!navigator.permissions?.query) {
      return null;
    }

    try {
      const status = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      permissionStateRef.current = status.state;
      return status.state;
    } catch (error) {
      console.warn("Unable to query camera permission status", error);
      return null;
    }
  }, []);

  const ensureCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        "Camera access is not supported on this device or browser. Try using the latest version of Chrome, Edge, Firefox, or Safari.",
      );
      setState("error");
      return false;
    }

    const status = await queryCameraPermission();

    if (status === "denied") {
      setErrorMessage(
        "Camera access is blocked. Enable it from your browser's site settings, then reload this page to continue.",
      );
      setState("error");
      return false;
    }

    return true;
  }, [queryCameraPermission]);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!(await ensureCameraPermission())) {
      setIsLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        VIDEO_CONSTRAINTS,
      );

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
          videoElement
            .play()
            .catch(() => {
              /* Autoplay policies may block playback until user interaction */
            });
        };
      }

      setState("preview");
    } catch (error) {
      console.error("Unable to access the camera", error);

      if (!isMountedRef.current) {
        return;
      }

      stopCamera();
      const message = getCameraErrorMessage(error);
      setErrorMessage(
        permissionStateRef.current === "denied"
          ? "Camera access is blocked. Enable it from your browser's site settings, then reload this page to continue."
          : message,
      );
      setState("error");
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [ensureCameraPermission, stopCamera]);

  useEffect(() => {
    isMountedRef.current = true;
    void startCamera();

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlayImage = overlayRef.current;
    if (!video || !canvas || state === "error") {
      return;
    }

    const width = video.videoWidth || 1600;
    const height = video.videoHeight || 900;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    if (overlayImage && overlayImage.complete) {
      context.drawImage(overlayImage, 0, 0, width, height);
    }

    const dataUrl = canvas.toDataURL("image/png");
    setPhotoDataUrl(dataUrl);
    setState("captured");
    stopCamera();
  }, [state, stopCamera]);

  const handleDownload = useCallback(() => {
    if (!photoDataUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = photoDataUrl;
    link.download = `photobooth-${Date.now()}.png`;
    link.click();
  }, [photoDataUrl]);

  const handleRetake = useCallback(() => {
    setPhotoDataUrl(null);
    setState("preview");
    setErrorMessage(null);
    void startCamera();
  }, [startCamera]);

  const handleRetry = useCallback(() => {
    setPhotoDataUrl(null);
    setErrorMessage(null);
    setState("preview");
    void startCamera();
  }, [startCamera]);

  const isCaptureDisabled =
    state === "captured" || state === "error" || isLoading;

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="text-center text-lg text-white/70">
        <p>Position yourself inside the frame, then tap capture.</p>
      </div>

      <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-white/20 bg-black/80 shadow-[0_40px_80px_-40px_rgba(15,15,15,0.8)]">
        {state !== "captured" && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            controls={false}
            controlsList="nodownload nofullscreen noplaybackrate"
            disablePictureInPicture
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {state === "captured" && photoDataUrl ? (
          <img
            src={photoDataUrl}
            alt="Captured photobooth frame"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        <img
          ref={overlayRef}
          src="/photo.png"
          alt="Photobooth frame overlay"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
          draggable={false}
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
            Initializing camera…
          </div>
        )}

        {errorMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center text-sm text-red-200">
            <div className="flex flex-col items-center gap-4">
              <p className="max-w-sm text-pretty text-base font-medium text-red-100">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-full border border-red-200/70 px-6 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-200/10"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleCapture}
          disabled={isCaptureDisabled}
          className="rounded-full bg-white px-10 py-3 text-base font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/40"
        >
          Capture
        </button>

        <button
          type="button"
          onClick={handleRetake}
          disabled={state !== "captured"}
          className="rounded-full border border-white/60 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
        >
          Retake
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!photoDataUrl}
          className="rounded-full border border-emerald-300 px-6 py-3 text-base font-semibold text-emerald-200 transition hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:border-emerald-200/30 disabled:text-emerald-200/30"
        >
          Download
        </button>
      </div>
    </div>
  );
}

export default PhotoBooth;

