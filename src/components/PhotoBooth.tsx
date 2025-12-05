"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NameBranchModal } from "./NameBranchModal";

type FacingMode = "user" | "environment" | "left" | "right";

type CameraSupport = {
  hasEnvironment: boolean;
  hasMultipleInputs: boolean;
};

const BASE_VIDEO_SETTINGS: MediaTrackConstraints = {
  width: { ideal: 1600 },
  height: { ideal: 900 },
};

const createVideoConstraints = (
  facingMode: FacingMode,
): MediaStreamConstraints => ({
  audio: false,
  video: {
    ...BASE_VIDEO_SETTINGS,
    facingMode,
  },
});

type CaptureState = "preview" | "captured" | "error";

const DEFAULT_CAMERA_ERROR_MESSAGE =
  "We couldn't start your camera. Please allow camera access in your browser settings and try again.";

type IconProps = {
  className?: string;
};

const IconCapture = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-4 w-4 sm:h-5 sm:w-5 ${className ?? ""}`}
    aria-hidden
  >
    <path d="M2.25 12c0-2.485 2.015-4.5 4.5-4.5h.75l1.262-1.684a1.5 1.5 0 0 1 1.2-.566h4.576a1.5 1.5 0 0 1 1.2.566L16.95 7.5h.3a4.5 4.5 0 0 1 4.5 4.5v3.75a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V12Z" />
    <circle cx={12} cy={13.5} r={3} />
  </svg>
);

const IconRetake = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-4 w-4 sm:h-5 sm:w-5 ${className ?? ""}`}
    aria-hidden
  >
    <path d="M3.75 12a8.25 8.25 0 0 1 14.22-5.25H15.3" />
    <path d="M20.25 12a8.25 8.25 0 0 1-14.22 5.25H8.7" />
    <path d="M15 6.75h3v-3" />
    <path d="M9 17.25h-3v3" />
  </svg>
);

const IconDownload = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-4 w-4 sm:h-5 sm:w-5 ${className ?? ""}`}
    aria-hidden
  >
    <path d="M12 3.75v10.5" />
    <path d="M8.25 10.5 12 14.25 15.75 10.5" />
    <path d="M4.5 17.25h15" />
  </svg>
);

const IconSwitchCamera = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-4 w-4 sm:h-5 sm:w-5 ${className ?? ""}`}
    aria-hidden
  >
    <path d="M6.3 7h11.4A1.8 1.8 0 0 1 19.5 8.8v6.4a1.8 1.8 0 0 1-1.8 1.8H6.3A1.8 1.8 0 0 1 4.5 15.2V8.8A1.8 1.8 0 0 1 6.3 7Z" />
    <path d="M9.4 7 10.4 5.4h3.2L14.6 7" />
    <circle cx={12} cy={12} r={2.3} />
    <path d="M6.2 17.8c2.3 3 6.9 3 9.2 0" />
    <path d="M17.5 17.8H20" />
    <path d="M20 17.8 18.2 16" />
    <path d="M20 17.8 18.2 19.6" />
  </svg>
);

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
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [cameraSupport, setCameraSupport] = useState<CameraSupport>({
    hasEnvironment: false,
    hasMultipleInputs: false,
  });
  const [showModal, setShowModal] = useState(true);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number; percentageX: number; percentageY: number } | null>(null);

  // Debug: Log when name or branch changes
  useEffect(() => {
    console.log("=== Name/Branch State Updated ===");
    console.log("Name:", name);
    console.log("Branch:", branch);
    console.log("Show Modal:", showModal);
  }, [name, branch, showModal]);

  // Handle mouse move on captured image to get coordinates
  const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    console.log("Mouse move event triggered");
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentageX = (x / rect.width) * 100;
    const percentageY = (y / rect.height) * 100;

    setMouseCoords({ x, y, percentageX, percentageY });
    console.log("Mouse position:", { x, y, percentageX, percentageY });
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    console.log("Click event triggered on image");
    e.stopPropagation();
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentageX = (x / rect.width) * 100;
    const percentageY = (y / rect.height) * 100;

    console.log("=== Clicked Coordinates ===");
    console.log("Pixel coordinates:", { x, y });
    console.log("Percentage coordinates:", { percentageX, percentageY });
    console.log("Image dimensions:", { width: rect.width, height: rect.height });

    // Also calculate what these would be in canvas coordinates
    const videoWidth = videoRef.current?.videoWidth || 1600;
    const videoHeight = videoRef.current?.videoHeight || 900;
    const canvasX = (percentageX / 100) * videoWidth;
    const canvasY = (percentageY / 100) * videoHeight;
    console.log("Canvas coordinates (estimated):", { canvasX, canvasY });
  }, []);

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

  const determineSwitchAvailability = useCallback(async (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    let hasEnvironment = false;
    let hasMultipleInputs = false;

    if (track && typeof track.getCapabilities === "function") {
      const capabilities = track.getCapabilities();
      const { facingMode } = capabilities;
      if (Array.isArray(facingMode)) {
        hasEnvironment = facingMode.includes("environment");
      }
    }

    if (navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((device) => device.kind === "videoinput");

        hasMultipleInputs = videoInputs.length > 1;

        if (!hasEnvironment) {
          hasEnvironment = videoInputs.some((device) => {
            const label = (device.label ?? "").toLowerCase();
            return (
              label.includes("back") ||
              label.includes("rear") ||
              label.includes("environment") ||
              label.includes("world")
            );
          });
        }
      } catch (deviceError) {
        console.warn("Unable to enumerate media devices", deviceError);
      }
    }

    setCameraSupport({
      hasEnvironment,
      hasMultipleInputs,
    });
  }, []);

  const startCamera = useCallback(
    async (mode: FacingMode) => {
      setIsLoading(true);
      setErrorMessage(null);
      setCameraSupport({ hasEnvironment: false, hasMultipleInputs: false });

      if (!(await ensureCameraPermission())) {
        setIsLoading(false);
        return;
      }

      let didFallback = false;

      try {
        stopCamera();

        const stream = await navigator.mediaDevices.getUserMedia(
          createVideoConstraints(mode),
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

        await determineSwitchAvailability(stream);

        setFacingMode(mode);
        setState("preview");
      } catch (error) {
        console.error("Unable to access the camera", error);

        if (!isMountedRef.current) {
          return;
        }

        stopCamera();
        const message = getCameraErrorMessage(error);

        if (
          mode !== "user" &&
          error instanceof DOMException &&
          (error.name === "OverconstrainedError" || error.name === "NotFoundError")
        ) {
          console.warn("Falling back to user-facing camera", error);
          setCameraSupport({
            hasEnvironment: false,
            hasMultipleInputs: false,
          });
          didFallback = true;
          void startCamera("user");
          return;
        }

        setErrorMessage(
          permissionStateRef.current === "denied"
            ? "Camera access is blocked. Enable it from your browser's site settings, then reload this page to continue."
            : message,
        );
        setState("error");
      } finally {
        if (isMountedRef.current && !didFallback) {
          setIsLoading(false);
        }
      }
    },
    [determineSwitchAvailability, ensureCameraPermission, stopCamera],
  );

  useEffect(() => {
    isMountedRef.current = true;
    void startCamera("user");

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

    const videoWidth = video.videoWidth || 1600;
    const videoHeight = video.videoHeight || 900;
    const videoAspectRatio = videoWidth / videoHeight;

    // Use video dimensions for canvas
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    // Draw video frame to fill canvas
    context.drawImage(video, 0, 0, videoWidth, videoHeight);

    // Draw overlay image stretched to fill video frame (ignore aspect ratio)
    if (overlayImage && overlayImage.complete) {
      // Stretch to fill both width and height exactly
      const x = 0;
      const y = 0;
      const scaledWidth = videoWidth;
      const scaledHeight = videoHeight;

      context.drawImage(overlayImage, x, y, scaledWidth, scaledHeight);
      console.log("Overlay image drawn successfully (stretched to fill frame)");
      console.log("Overlay image original dimensions:", {
        width: overlayImage.naturalWidth,
        height: overlayImage.naturalHeight
      });
      console.log("Overlay image scaled dimensions:", { scaledWidth, scaledHeight });
      console.log("Overlay image position:", { x, y });
      console.log("Video dimensions:", { videoWidth, videoHeight });
      console.log("Name:", name, "Branch:", branch);

      // Render Name and Branch text on the canvas
      if (name && branch) {
        // Use percentage-based positioning for responsive text placement
        // These percentages were determined by clicking on the blank lines in the preview
        // Name: X: 19.97%, Y: 85.42%
        // Branch: X: 21.92%, Y: 89.24%
        const nameXPercent = 19.97;
        const nameYPercent = 85.42;
        const branchXPercent = 21.92;
        const branchYPercent = 89.24;

        // Calculate canvas coordinates from percentages (responsive to any canvas size)
        const nameX = (nameXPercent / 100) * videoWidth;
        const nameY = (nameYPercent / 100) * videoHeight;
        const branchX = (branchXPercent / 100) * videoWidth;
        const branchY = (branchYPercent / 100) * videoHeight;

        // Font size scales with canvas width for responsiveness
        // Base font size on 1600px width, scale proportionally
        const baseFontSize = 32; // Base size for 1600px width
        const fontSize = Math.max(20, Math.round((baseFontSize / 1600) * videoWidth));

        console.log("=== Text Rendering ===");
        console.log("Canvas dimensions:", { videoWidth, videoHeight });
        console.log("Name position:", { x: nameX, y: nameY, xPercent: nameXPercent, yPercent: nameYPercent });
        console.log("Branch position:", { x: branchX, y: branchY, xPercent: branchXPercent, yPercent: branchYPercent });
        console.log("Font size:", fontSize);
        console.log("Text values:", { name: name.trim(), branch: branch.trim() });

        context.fillStyle = "#FFFFFF";
        context.font = `bold ${fontSize}px sans-serif`;
        context.textAlign = "left";
        context.textBaseline = "middle";

        // Draw text with shadow for better visibility
        context.shadowColor = "rgba(0, 0, 0, 0.9)";
        context.shadowBlur = 5;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;

        // Draw the text at the exact positions
        context.fillText(name.trim(), nameX, nameY);
        context.fillText(branch.trim(), branchX, branchY);

        // Reset shadow
        context.shadowColor = "transparent";
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;

        console.log("Text drawn successfully");
      } else {
        console.log("Name or branch missing:", { name, branch });
      }
    }

    const dataUrl = canvas.toDataURL("image/png");
    setPhotoDataUrl(dataUrl);
    setState("captured");
    stopCamera();
  }, [state, stopCamera, name, branch]);

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
    void startCamera(facingMode);
  }, [facingMode, startCamera]);

  const handleRetry = useCallback(() => {
    setPhotoDataUrl(null);
    setErrorMessage(null);
    setState("preview");
    void startCamera(facingMode);
  }, [facingMode, startCamera]);

  const isSwitchAvailable = cameraSupport.hasEnvironment;

  const handleSwitchCamera = useCallback(() => {
    if (isLoading || !isSwitchAvailable || state !== "preview") {
      return;
    }

    const nextFacingMode: FacingMode =
      facingMode === "user" ? "environment" : "user";

    setPhotoDataUrl(null);
    setState("preview");
    setErrorMessage(null);
    void startCamera(nextFacingMode);
  }, [facingMode, isLoading, isSwitchAvailable, startCamera, state]);

  const handleModalSubmit = useCallback((submittedName: string, submittedBranch: string) => {
    console.log("=== Modal Submit Called ===");
    console.log("Submitted Name:", submittedName);
    console.log("Submitted Branch:", submittedBranch);
    setName(submittedName);
    setBranch(submittedBranch);
    setShowModal(false);
    console.log("Modal closed, name and branch set");
  }, []);

  const isCaptureDisabled =
    state === "captured" || state === "error" || isLoading || showModal;

  const showSwitchButton =
    isSwitchAvailable && state === "preview" && !errorMessage && !showModal;

    return (
      <>
        {showModal && <NameBranchModal onSubmit={handleModalSubmit} />}
        <div className="photobooth-layout flex w-full max-w-4xl flex-1 flex-col items-center gap-6 sm:gap-8">
        <div className="photobooth-instructions text-center text-sm text-white/70 sm:text-base">
          <p>Position yourself inside the frame, then tap capture.</p>
        </div>

        <div className="photobooth-stage">
          <div
            className="photobooth-frame relative aspect-video w-full overflow-hidden rounded-[2.5rem] border border-white/20 bg-black/80 shadow-[0_40px_80px_-40px_rgba(15,15,15,0.8)] cursor-crosshair"
            onMouseMove={(e) => {
              if (!showModal && state === "preview") {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const percentageX = (x / rect.width) * 100;
                const percentageY = (y / rect.height) * 100;

                setMouseCoords({ x, y, percentageX, percentageY });
                console.log("Preview mouse position:", { x, y, percentageX, percentageY });
              }
            }}
            onClick={(e) => {
              if (!showModal && state === "preview") {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const percentageX = (x / rect.width) * 100;
                const percentageY = (y / rect.height) * 100;

                console.log("=== Clicked Coordinates (Preview) ===");
                console.log("Pixel coordinates:", { x, y });
                console.log("Percentage coordinates:", { percentageX, percentageY });
                console.log("Container dimensions:", { width: rect.width, height: rect.height });

                // Calculate canvas coordinates
                const videoWidth = videoRef.current?.videoWidth || 1600;
                const videoHeight = videoRef.current?.videoHeight || 900;
                const canvasX = (percentageX / 100) * videoWidth;
                const canvasY = (percentageY / 100) * videoHeight;
                console.log("Canvas coordinates (for text positioning):", { canvasX, canvasY });
                console.log("Use these percentages for text:", { percentageX, percentageY });
              }
            }}
          >
            {state !== "captured" && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                controlsList="nodownload nofullscreen noplaybackrate"
                disablePictureInPicture
                className="absolute inset-0 h-full w-full object-fit"
              />
            )}

            {state === "captured" && photoDataUrl ? (
              <>
                <img
                  src={photoDataUrl}
                  alt="Captured photobooth frame"
                  className="absolute inset-0 h-full w-full object-fit cursor-crosshair z-10"
                  onMouseMove={handleImageMouseMove}
                  onClick={handleImageClick}
                  onMouseEnter={() => console.log("Mouse entered captured image")}
                />
                {mouseCoords && (
                  <div className="absolute top-4 left-4 bg-black/90 text-white p-3 rounded-lg text-sm font-mono z-50 pointer-events-none border border-white/20">
                    <div className="font-bold mb-1">Coordinates:</div>
                    <div>X: {mouseCoords.x.toFixed(0)}px ({mouseCoords.percentageX.toFixed(2)}%)</div>
                    <div>Y: {mouseCoords.y.toFixed(0)}px ({mouseCoords.percentageY.toFixed(2)}%)</div>
                    <div className="text-yellow-300 mt-2 text-xs">Click to log to console</div>
                  </div>
                )}
              </>
            ) : null}

          <img
            ref={overlayRef}
            src="/photo_frame_2.png"
            alt="Photobooth frame overlay"
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-fit z-0"
            draggable={false}
          />

          {/* Show name and branch text in preview */}
          {!showModal && state === "preview" && name && branch && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Name text */}
              <div
                className="absolute text-white font-bold"
                style={{
                  left: "19.97%",
                  top: "84.7%",
                  transform: "translateY(-50%)",
                  fontSize: "clamp(16px, 2vw, 32px)",
                  textShadow: "2px 2px 4px rgba(0, 0, 0, 0.9)",
                }}
              >
                {name}
              </div>
              {/* Branch text */}
              <div
                className="absolute text-white font-bold"
                style={{
                  left: "21.92%",
                  top: "89.24%",
                  transform: "translateY(-50%)",
                  fontSize: "clamp(16px, 2vw, 32px)",
                  textShadow: "2px 2px 4px rgba(0, 0, 0, 0.9)",
                }}
              >
                {branch}
              </div>
            </div>
          )}

          {/* Show coordinates on preview */}
          {!showModal && state === "preview" && mouseCoords && (
            <div className="absolute top-4 left-4 bg-black/90 text-white p-3 rounded-lg text-sm font-mono z-50 pointer-events-none border border-white/20">
              <div className="font-bold mb-1">Coordinates:</div>
              <div>X: {mouseCoords.x.toFixed(0)}px ({mouseCoords.percentageX.toFixed(2)}%)</div>
              <div>Y: {mouseCoords.y.toFixed(0)}px ({mouseCoords.percentageY.toFixed(2)}%)</div>
              <div className="text-yellow-300 mt-2 text-xs">Click to log coordinates</div>
            </div>
          )}

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
      </div>

      <div className="photobooth-actions flex w-full flex-wrap items-center justify-center gap-3 sm:gap-4">
        {showSwitchButton && (
          <button
            type="button"
            onClick={handleSwitchCamera}
            disabled={isLoading || state !== "preview"}
            aria-label={
              facingMode === "user"
                ? "Switch to back camera"
                : "Switch to front camera"
            }
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/40 sm:px-8 sm:text-base cursor-pointer"
          >
            <IconSwitchCamera className="h-5 w-5" /> Switch Camera
          </button>
        )}

        <button
          type="button"
          onClick={handleCapture}
          disabled={isCaptureDisabled}
          className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/40 sm:px-8 sm:text-base"
        >
          <IconCapture />
          <span>Capture</span>
        </button>

        <button
          type="button"
          onClick={handleRetake}
          disabled={state !== "captured"}
          className="inline-flex items-center gap-2 rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40 sm:text-base"
        >
          <IconRetake />
          <span>Retake</span>
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!photoDataUrl}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-300 px-6 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:border-emerald-200/30 disabled:text-emerald-200/30 sm:text-base"
        >
          <IconDownload />
          <span>Download</span>
        </button>
      </div>
    </div>
      </>
  );
}

export default PhotoBooth;

