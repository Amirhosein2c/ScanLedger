"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useApiMutation } from "../hooks/useApiMutation";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { toast } from "sonner";

const SECURE_CONTEXT_MESSAGE =
  "Camera access requires HTTPS or running from localhost during development.";

const isLoopbackHost = (normalizedHost: string) =>
  normalizedHost === "localhost" ||
  normalizedHost === "127.0.0.1" ||
  normalizedHost === "[::1]" ||
  normalizedHost === "0.0.0.0";

const ensureSecureCameraContext = (isSecure: boolean, hostname: string) => {
  if (!isSecure && !isLoopbackHost(hostname.toLowerCase())) {
    throw new Error(SECURE_CONTEXT_MESSAGE);
  }
};

const stopMediaStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  successCallback: (stream: MediaStream) => void,
  errorCallback?: (error: MediaStream | DOMException) => void
) => void;

type LegacyNavigator = Navigator & {
  getUserMedia?: LegacyGetUserMedia;
  webkitGetUserMedia?: LegacyGetUserMedia;
  mozGetUserMedia?: LegacyGetUserMedia;
};

const getLegacyGetUserMedia = (): LegacyGetUserMedia | undefined => {
  const legacyNavigator = navigator as LegacyNavigator;
  return (
    legacyNavigator.getUserMedia ??
    legacyNavigator.webkitGetUserMedia ??
    legacyNavigator.mozGetUserMedia
  );
};

const requestCameraStream = async (isSecure: boolean, hostname: string) => {
  ensureSecureCameraContext(isSecure, hostname);

  const mediaDevices = navigator.mediaDevices;
  if (mediaDevices?.getUserMedia) {
    return mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
    });
  }

  const legacyGetUserMedia = getLegacyGetUserMedia();
  if (legacyGetUserMedia) {
    return new Promise<MediaStream>((resolve, reject) => {
      legacyGetUserMedia.call(
        navigator,
        { video: { facingMode: "environment" } },
        resolve,
        reject
      );
    });
  }

  throw new Error(
    "Camera access is not supported by this browser. Try updating it or using the native camera upload."
  );
};

const normalizeCameraError = (
  cameraErr: unknown,
  {
    isSecure,
    hostname,
  }: {
    isSecure: boolean;
    hostname: string;
  }
) => {
  const normalizedHost = hostname.toLowerCase();
  if (!isSecure && !isLoopbackHost(normalizedHost)) {
    return SECURE_CONTEXT_MESSAGE;
  }

  if (cameraErr && typeof cameraErr === "object") {
    const errWithName = cameraErr as { name?: string; message?: string };
    const errorMessage = errWithName.message ?? "";

    if (errWithName.name === "NotAllowedError") {
      return "Camera permission denied. Enable it in your browser or device settings.";
    }
    if (errWithName.name === "NotFoundError") {
      return "No camera device detected. Connect a camera and try again.";
    }
    if (errorMessage) {
      return errorMessage;
    }
  } else if (cameraErr instanceof Error && cameraErr.message) {
    return cameraErr.message;
  }

  return "Unable to access the camera. Please allow camera permissions or use a secure/trusted local connection.";
};

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = /data:(.*?);base64/.exec(meta);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }

  return new Blob([buffer], { type: mime });
};
const DocumentScan = () => {
  const router = useRouter();
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });

  // References to DOM elements we manipulate directly.
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stateful data that drives what the user sees.
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [captureMode, setCaptureMode] = useState<"single" | "batch">("single");

  // API client used to submit the captured image for OCR.
  const ocrMutation = useApiMutation<string, FormData>({
    path: "/multi-agent-ocr",
    method: "POST",
    config: { responseType: "text" },
  });
  const isUploading = ocrMutation.isPending;

  useEffect(() => {
    // Boot the camera stream when the component mounts.
    if (typeof window === "undefined") {
      return;
    }

    let isSubscribed = true;
    const hostname = window.location.hostname;
    const isSecure =
      window.isSecureContext || window.location.protocol === "https:";

    const attachStreamToVideo = (stream: MediaStream) => {
      const videoElement = videoRef.current;
      if (!videoElement) {
        setIsCameraReady(true);
        return;
      }

      videoElement.srcObject = stream;
      videoElement.setAttribute("playsinline", "true");
      videoElement
        .play()
        .then(() => setIsCameraReady(true))
        .catch(() => setIsCameraReady(true));
    };

    const startCamera = async () => {
      // Reset UI state before trying to acquire a new stream.
      setIsCameraReady(false);
      setCameraError(null);

      try {
        const stream = await requestCameraStream(isSecure, hostname);

        if (!isSubscribed) {
          stopMediaStream(stream);
          return;
        }

        streamRef.current = stream;
        attachStreamToVideo(stream);
        setCameraError(null);
      } catch (cameraErr) {
        if (!isSubscribed) {
          return;
        }
        setCameraError(
          normalizeCameraError(cameraErr, {
            isSecure,
            hostname,
          })
        );
      }
    };

    startCamera();

    return () => {
      isSubscribed = false;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  // Persist the preview so we can return to it after navigating away.
  const persistImageDataUrl = (dataUrl: string) => {
    setImagePreview(dataUrl);
    setError(null);
    setCameraError(null);
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage?.setItem("scannedImageDataUrl", dataUrl);
        window.localStorage?.setItem("scannedImageDataUrl", dataUrl);
      }
    } catch (storageError) {
      console.warn("Unable to store preview in session storage", storageError);
    }
  };

  const persistOcrResult = (payload: string) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.sessionStorage?.setItem("ocrResultData", payload);
      window.localStorage?.setItem("ocrResultData", payload);
    } catch (storageError) {
      console.warn("Unable to store OCR result locally", storageError);
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Only image capture is supported in this build.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        return;
      }
      persistImageDataUrl(result);
    };
    reader.onerror = () => setError("Failed to read image. Please try again.");
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setImagePreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCapture = () => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      setError("Camera is not ready yet. Please try again.");
      return;
    }

    if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError("Camera is still initializing. Hold on a second and retry.");
      return;
    }

    if (!canvasRef.current && typeof document !== "undefined") {
      // Lazily create an off-screen canvas used to snapshot the current frame.
      canvasRef.current = document.createElement("canvas");
    }

    const canvasElement = canvasRef.current;
    if (!canvasElement) {
      setError("Unable to capture image. Please try again.");
      return;
    }

    canvasElement.width = videoElement.videoWidth || 1080;
    canvasElement.height = videoElement.videoHeight || 1440;

    const context = canvasElement.getContext("2d");
    if (!context) {
      setError("Unable to capture image. Please try again.");
      return;
    }

    context.drawImage(
      videoElement,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );

    try {
      const dataUrl = canvasElement.toDataURL("image/png");
      persistImageDataUrl(dataUrl);
    } catch (captureError) {
      console.error(captureError);
      setError("Failed to capture image from camera.");
    }
  };

  const handleProcess = async () => {
    if (!imagePreview) {
      setError("Capture or upload a document first.");
      return;
    }

    ocrMutation.reset();
    setError(null);

    try {
      // Build the form payload that the OCR endpoint expects.
      const blob = dataUrlToBlob(imagePreview);
      const formData = new FormData();
      formData.append("file", blob, "scanned_image.png");
      formData.append("source", "camera_capture");
      formData.append("timestamp", new Date().toISOString());

      const textBody = await ocrMutation.mutateAsync(formData);

      let parsedResult: unknown = null;
      try {
        parsedResult =
          typeof textBody === "string" ? JSON.parse(textBody) : textBody;
      } catch (parseError) {
        console.warn(
          "Failed to parse OCR response as JSON, storing raw text",
          parseError
        );
      }

      const serialized = parsedResult
        ? JSON.stringify(parsedResult)
        : String(textBody ?? "");

      // Store for the details page so it can preload the OCR output.
      persistOcrResult(serialized);
      router.push("/documents/details");
    } catch (uploadError) {
      const normalizedError =
        uploadError instanceof Error
          ? uploadError
          : new Error(String(uploadError));
      console.error(normalizedError);
      setError(normalizedError.message || "Upload failed. Please try again.");
    }
  };

  // Surface new error messages through a toast notification.
  useEffect(() => {
    const activeMessage = error || cameraError;
    if (!activeMessage) {
      return;
    }
    toast.error(activeMessage);
  }, [error, cameraError]);

  // Custom header to match the camera capture UI.
  const header = (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        onClick={() => setError("Flash toggle is not available in this build.")}
      >
        <span className="material-symbols-outlined">flash_on</span>
      </Button>
      <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
        Scan Document
      </h2>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        onClick={() => router.push("/dashboard")}
      >
        <span className="material-symbols-outlined">close</span>
      </Button>
    </div>
  );

  return (
    <AppLayout
      header={header}
      className="bg-[#111827] text-white h-[100dvh] max-h-[100dvh] overflow-hidden"
      contentClassName="flex flex-1 min-h-0 flex-col gap-4 pb-24"
      isContentScrollable={false}
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex flex-1 min-h-0 flex-col items-center gap-4">
          <div className="flex w-full flex-1 min-h-0 items-center justify-center">
            <Card className="relative flex aspect-[3/4] h-full max-h-full w-full max-w-sm items-center justify-center overflow-hidden rounded-[1.75rem] border-2 border-dashed border-white/25 bg-[#2f3649]/70">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Captured document"
                  className="h-full w-full object-cover"
                />
              ) : cameraError ? (
                <div className="flex flex-col items-center justify-center px-8 text-center text-sm text-white/80">
                  <p>{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    onLoadedMetadata={() => setIsCameraReady(true)}
                  />
                  {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0b1324]/60 text-sm text-white/80 backdrop-blur-sm">
                      Initializing camera…
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6 text-center text-sm text-white/80">
                    <p>
                      Position document within the frame
                      <br />
                      Then press the capture button
                    </p>
                  </div>
                </>
              )}

              <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] border border-white/10" />

              <Button
                variant="secondary"
                size="icon"
                className="pointer-events-auto absolute bottom-4 left-4 rounded-full bg-white/15 text-white hover:bg-white/25"
                onClick={imagePreview ? handleRetake : handleSelectFile}
                disabled={isUploading}
              >
                <span className="material-symbols-outlined">
                  {imagePreview ? "refresh" : "photo_library"}
                </span>
              </Button>

              <Button
                size="icon"
                className="pointer-events-auto absolute bottom-4 right-4 rounded-full bg-[var(--primary-color)] text-[#111827] hover:bg-[var(--primary-color)]/90"
                onClick={handleProcess}
                disabled={!imagePreview || isUploading}
              >
                <span className="material-symbols-outlined">check</span>
              </Button>

              {isUploading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0b1324]/80 px-6 text-center backdrop-blur-sm">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white/20 border-t-[var(--primary-color)] animate-spin" />
                  <p className="text-lg font-semibold text-white">
                    Processing the document,
                    <br />
                    Please wait!
                  </p>
                  <p className="mt-3 text-sm text-white/70">
                    Do not close this tab. Upload &amp; OCR may take a few
                    seconds.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="flex w-full max-w-xs items-center justify-between rounded-full bg-[#0b1324] p-1 text-sm font-medium">
            {(["single", "batch"] as const).map((mode) => {
              const isActive = captureMode === mode;
              return (
                <Button
                  key={mode}
                  variant={isActive ? "default" : "ghost"}
                  className={`flex-1 rounded-full ${
                    isActive
                      ? "bg-white text-[#111827] hover:bg-white"
                      : "text-white/60 hover:bg-white/10"
                  }`}
                  onClick={() => setCaptureMode(mode)}
                >
                  {mode === "single" ? "Single" : "Batch"}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-12">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-[#1f2736] text-white hover:bg-[#253048]"
            onClick={handleSelectFile}
            disabled={isUploading}
          >
            <span className="material-symbols-outlined">photo_library</span>
          </Button>
          <Button
            size="icon"
            className="h-20 w-20 rounded-full bg-white text-[#111827] shadow-[0_12px_28px_rgba(12,15,30,0.55)] hover:bg-white"
            onClick={handleCapture}
            disabled={isUploading || !isCameraReady}
          >
            <span className="material-symbols-outlined text-3xl text-[#0f172a]">
              camera
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-[#1f2736] text-white hover:bg-[#253048]"
            onClick={handleProcess}
            disabled={!imagePreview || isUploading}
          >
            <span className="material-symbols-outlined">description</span>
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </AppLayout>
  );
};

export default DocumentScan;
