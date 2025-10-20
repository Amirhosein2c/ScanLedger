"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useApiMutation } from "../hooks/useApiMutation";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { toast } from "sonner";
import { translate, useTranslation } from "@/src/lib/i18n";

type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  success: (stream: MediaStream) => void,
  error?: (err: DOMException) => void
) => void;

type LegacyNavigator = Navigator & {
  getUserMedia?: LegacyGetUserMedia;
  webkitGetUserMedia?: LegacyGetUserMedia;
  mozGetUserMedia?: LegacyGetUserMedia;
};

const SECURE_CONTEXT_MESSAGE_KEY = "documentScan.errors.secureContext";

const isLoopbackHost = (normalizedHost: string) =>
  normalizedHost === "localhost" ||
  normalizedHost === "127.0.0.1" ||
  normalizedHost === "[::1]" ||
  normalizedHost === "0.0.0.0";

const ensureSecureCameraContext = (isSecure: boolean, hostname: string) => {
  if (!isSecure && !isLoopbackHost(hostname.toLowerCase())) {
    throw new Error(translate(SECURE_CONTEXT_MESSAGE_KEY));
  }
};

const stopMediaStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

const PREFERRED_CAMERA_STORAGE_KEY = "preferredRearCameraDeviceId";

const getPreferredCameraDeviceId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage?.getItem(PREFERRED_CAMERA_STORAGE_KEY);
  } catch (storageError) {
    console.warn("Unable to read preferred camera id", storageError);
    return null;
  }
};

const setPreferredCameraDeviceId = (deviceId: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage?.setItem(PREFERRED_CAMERA_STORAGE_KEY, deviceId);
  } catch (storageError) {
    console.warn("Unable to persist preferred camera id", storageError);
  }
};

const buildCameraConstraints = (deviceId?: string): MediaStreamConstraints => {
  const base: MediaTrackConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  };

  return {
    audio: false,
    video: deviceId
      ? {
          ...base,
          deviceId: { exact: deviceId },
          facingMode: { ideal: "environment" },
        }
      : {
          ...base,
          facingMode: { ideal: "environment" },
        },
  };
};

const isLikelyUltraWideLabel = (label: string) => {
  const normalized = label.toLowerCase();
  return (
    normalized.includes("ultra") ||
    normalized.includes("0.5") ||
    normalized.includes("0,5")
  );
};

const isLikelyRearLabel = (label: string) => {
  const normalized = label.toLowerCase();
  return (
    normalized.includes("back") ||
    normalized.includes("rear") ||
    normalized.includes("environment")
  );
};

const getLegacyGetUserMedia = (): LegacyGetUserMedia | undefined => {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as LegacyNavigator;
  return nav.getUserMedia ?? nav.webkitGetUserMedia ?? nav.mozGetUserMedia;
};

const getUserMediaPromise = (constraints: MediaStreamConstraints) => {
  // Modern, spec API first
  if (
    typeof navigator !== "undefined" &&
    navigator.mediaDevices?.getUserMedia
  ) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }
  // Legacy fallbacks
  const legacy = getLegacyGetUserMedia();
  if (legacy) {
    return new Promise<MediaStream>((resolve, reject) => {
      legacy.call(navigator as LegacyNavigator, constraints, resolve, (e) =>
        reject(e)
      );
    });
  }
  return Promise.reject(
    new Error(translate("documentScan.errors.getUserMediaUnsupported"))
  );
};

const findPreferredRearCameraDeviceId = async (): Promise<string | null> => {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return null;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(
      (device) => device.kind === "videoinput"
    );

    if (!videoInputs.length) {
      return null;
    }

    const preferredMatch =
      videoInputs.find(
        (device) =>
          isLikelyRearLabel(device.label) &&
          !isLikelyUltraWideLabel(device.label)
      ) ??
      videoInputs.find((device) => isLikelyRearLabel(device.label)) ??
      null;

    return preferredMatch?.deviceId ?? null;
  } catch (error) {
    console.warn("Unable to enumerate video devices", error);
    return null;
  }
};

const ensurePreferredRearCamera = async (
  stream: MediaStream
): Promise<MediaStream> => {
  if (typeof navigator === "undefined") {
    return stream;
  }

  const [track] = stream.getVideoTracks();
  const label = track?.label ?? "";
  const settings = track?.getSettings();

  if (!label) {
    return stream;
  }

  if (!isLikelyUltraWideLabel(label) && settings?.deviceId) {
    setPreferredCameraDeviceId(settings.deviceId);
    return stream;
  }

  const preferredDeviceId = await findPreferredRearCameraDeviceId();
  if (!preferredDeviceId || preferredDeviceId === settings?.deviceId) {
    return stream;
  }

  try {
    const preferredStream = await getUserMediaPromise(
      buildCameraConstraints(preferredDeviceId)
    );
    setPreferredCameraDeviceId(preferredDeviceId);
    return preferredStream;
  } catch (error) {
    console.warn("Unable to switch to preferred rear camera", error);
    return stream;
  }
};

const requestCameraStream = async (isSecure: boolean, hostname: string) => {
  ensureSecureCameraContext(isSecure, hostname);

  const constraintsQueue: MediaStreamConstraints[] = [];
  const storedDeviceId = getPreferredCameraDeviceId();
  if (storedDeviceId) {
    constraintsQueue.push(buildCameraConstraints(storedDeviceId));
  }
  constraintsQueue.push(buildCameraConstraints());

  let lastError: unknown = null;
  for (const constraints of constraintsQueue) {
    try {
      return await getUserMediaPromise(constraints);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(translate("documentScan.errors.cameraUnsupported"));
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
    return translate(SECURE_CONTEXT_MESSAGE_KEY);
  }

  if (cameraErr && typeof cameraErr === "object") {
    const errWithName = cameraErr as { name?: string; message?: string };
    const errorMessage = errWithName.message ?? "";

    if (errWithName.name === "NotAllowedError") {
      return translate("documentScan.errors.permissionDenied");
    }
    if (errWithName.name === "NotFoundError") {
      return translate("documentScan.errors.noCameraFound");
    }
    if (errorMessage) {
      return errorMessage;
    }
  } else if (cameraErr instanceof Error && cameraErr.message) {
    return cameraErr.message;
  }

  return translate("documentScan.errors.unableToAccess");
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
  const { t } = useTranslation();

  // References to DOM elements we manipulate directly.
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isComponentActiveRef = useRef(true);

  // Stateful data that drives what the user sees.
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [captureMode, setCaptureMode] = useState<"single" | "batch">("single");
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);
  const [isTogglingFlash, setIsTogglingFlash] = useState(false);

  // API client used to submit the captured image for OCR.
  const ocrMutation = useApiMutation<string, FormData>({
    path: "/multi-agent-ocr",
    method: "POST",
    config: { responseType: "text" },
  });
  const isUploading = ocrMutation.isPending;
  const updateTorchAvailability = useCallback((stream: MediaStream | null) => {
    if (!stream) {
      setIsTorchAvailable(false);
      setIsFlashOn(false);
      return;
    }

    const [track] = stream.getVideoTracks();
    if (!track || typeof track.getCapabilities !== "function") {
      setIsTorchAvailable(false);
      setIsFlashOn(false);
      return;
    }

    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
      torch?: boolean;
    };
    const supportsTorch =
      typeof capabilities.torch === "boolean" ? capabilities.torch : false;

    setIsTorchAvailable(supportsTorch);
    if (!supportsTorch) {
      setIsFlashOn(false);
    }
  }, []);

  const attachStreamToVideo = useCallback(
    (stream: MediaStream) => {
      const videoElement = videoRef.current;
      if (!videoElement) {
        setIsCameraReady(true);
        return;
      }

      if (videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }

      videoElement.setAttribute("playsinline", "true");
      videoElement
        .play()
        .then(() => setIsCameraReady(true))
        .catch(() => setIsCameraReady(true));
    },
    [setIsCameraReady]
  );

  const initCamera = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }

    updateTorchAvailability(null);

    const hostname = window.location.hostname;
    const isSecure =
      window.isSecureContext || window.location.protocol === "https:";

    setIsCameraReady(false);
    setCameraError(null);

    try {
      let stream = await requestCameraStream(isSecure, hostname);

      if (!isComponentActiveRef.current) {
        stopMediaStream(stream);
        return;
      }

      const preferredStream = await ensurePreferredRearCamera(stream);
      if (!isComponentActiveRef.current) {
        stopMediaStream(preferredStream);
        if (preferredStream !== stream) {
          stopMediaStream(stream);
        }
        return;
      }

      if (preferredStream !== stream) {
        stopMediaStream(stream);
        stream = preferredStream;
      }

      streamRef.current = stream;
      attachStreamToVideo(stream);
      setCameraError(null);
      updateTorchAvailability(stream);
    } catch (cameraErr) {
      if (!isComponentActiveRef.current) {
        return;
      }

      setCameraError(
        normalizeCameraError(cameraErr, {
          isSecure,
          hostname,
        })
      );
    }
  }, [attachStreamToVideo, updateTorchAvailability]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    isComponentActiveRef.current = true;
    initCamera();

    return () => {
      isComponentActiveRef.current = false;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, [initCamera]);

  useEffect(() => {
    if (imagePreview) {
      return;
    }
    const stream = streamRef.current;
    if (!stream) {
      return;
    }
    attachStreamToVideo(stream);
  }, [attachStreamToVideo, imagePreview]);

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

  const handleToggleFlash = async () => {
    if (isTogglingFlash) {
      return;
    }

    const stream = streamRef.current;
    const [track] = stream?.getVideoTracks() ?? [];
    if (!stream || !track) {
      setError(t("documentScan.errors.flashUnavailable"));
      return;
    }

    if (typeof track.getCapabilities !== "function") {
      setError(t("documentScan.errors.flashUnsupported"));
      setIsTorchAvailable(false);
      setIsFlashOn(false);
      return;
    }

    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
      torch?: boolean;
    };
    const supportsTorch =
      typeof capabilities.torch === "boolean" ? capabilities.torch : false;

    if (!supportsTorch) {
      setError(t("documentScan.errors.flashUnsupported"));
      setIsTorchAvailable(false);
      setIsFlashOn(false);
      return;
    }

    const nextFlashState = !isFlashOn;

    try {
      setIsTogglingFlash(true);
      await track.applyConstraints({
        advanced: [{ torch: nextFlashState }],
      } as MediaTrackConstraints & {
        advanced?: Array<{ torch?: boolean }>;
      });
      setIsFlashOn(nextFlashState);
      setIsTorchAvailable(true);
    } catch (toggleError) {
      console.warn("Unable to toggle camera flash", toggleError);
      setError(t("documentScan.errors.flashToggleFailed"));
      updateTorchAvailability(streamRef.current);
    } finally {
      setIsTogglingFlash(false);
    }
  };

  const handleSelectFile = () => {
    const input = galleryInputRef.current;
    if (!input) {
      return;
    }

    input.value = "";
    input.removeAttribute("capture");
    input.click();
  };

  async function processImageDataUrl(dataUrl: string) {
    ocrMutation.reset();
    setError(null);

    try {
      const blob = dataUrlToBlob(dataUrl);
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

      persistOcrResult(serialized);
      router.push("/documents/details");
    } catch (uploadError) {
      const normalizedError =
        uploadError instanceof Error
          ? uploadError
          : new Error(String(uploadError));
      console.error(normalizedError);
      setError(
        normalizedError.message || t("documentScan.errors.uploadFailed")
      );
    }
  }

  const readFileAsPreview = (
    file: File,
    { autoProcess = false }: { autoProcess?: boolean } = {}
  ) => {
    if (!file.type.startsWith("image/")) {
      setError(t("documentScan.errors.onlyImagesSupported"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        return;
      }

      persistImageDataUrl(result);
      if (autoProcess) {
        void processImageDataUrl(result);
      }
    };
    reader.onerror = () => setError(t("documentScan.errors.readImageFailed"));
    reader.readAsDataURL(file);
  };

  const handleGalleryFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { current } = galleryInputRef;
    if (current) {
      current.removeAttribute("capture");
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    readFileAsPreview(file);
    event.target.value = "";
  };

  const handleGeneralFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    readFileAsPreview(file, { autoProcess: true });
    event.target.value = "";
  };

  const handleRetake = () => {
    setImagePreview(null);
    setError(null);
    updateTorchAvailability(null);
    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
      galleryInputRef.current.removeAttribute("capture");
    }
    if (generalFileInputRef.current) {
      generalFileInputRef.current.value = "";
    }
    initCamera();
  };

  const handleCapture = () => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      setError(t("documentScan.errors.cameraNotReady"));
      return;
    }

    if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError(t("documentScan.errors.cameraInitializing"));
      return;
    }

    if (!canvasRef.current && typeof document !== "undefined") {
      // Lazily create an off-screen canvas used to snapshot the current frame.
      canvasRef.current = document.createElement("canvas");
    }

    const canvasElement = canvasRef.current;
    if (!canvasElement) {
      setError(t("documentScan.errors.captureFailed"));
      return;
    }

    canvasElement.width = videoElement.videoWidth || 1080;
    canvasElement.height = videoElement.videoHeight || 1440;

    const context = canvasElement.getContext("2d");
    if (!context) {
      setError(t("documentScan.errors.captureFailed"));
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
      setError(t("documentScan.errors.captureException"));
    }
  };

  const handleProcess = async () => {
    if (!imagePreview) {
      const input = generalFileInputRef.current;
      if (!input) {
        setError(t("documentScan.errors.noPreview"));
        return;
      }

      input.value = "";
      input.click();
      return;
    }

    await processImageDataUrl(imagePreview);
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
        className={`rounded-full hover:bg-white/10 hover:text-white ${
          isFlashOn ? "text-white" : "text-white/70"
        } ${!isTorchAvailable ? "opacity-60" : ""}`}
        onClick={handleToggleFlash}
        aria-pressed={isFlashOn}
        disabled={isTogglingFlash || isUploading}
        title={
          !isTorchAvailable && streamRef.current
            ? t("documentScan.errors.flashUnsupported")
            : undefined
        }
      >
        <span className="material-symbols-outlined">flash_on</span>
      </Button>
      <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
        {t("documentScan.header.title")}
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
                  alt={t("documentScan.previewAlt")}
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
                      {t("documentScan.status.initializingCamera")}
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6 text-center text-sm text-white/80">
                    <p>
                      {t("documentScan.instructions.primary")}
                      <br />
                      {t("documentScan.instructions.secondary")}
                    </p>
                  </div>
                </>
              )}

              <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] border border-white/10" />

              <Button
                variant="secondary"
                size="icon"
                className="pointer-events-auto absolute bottom-4 left-4 rounded-full bg-red-500 text-white hover:bg-red-500"
                onClick={handleRetake}
                disabled={isUploading || !imagePreview}
              >
                <span className="material-symbols-outlined">close</span>
              </Button>

              <Button
                size="icon"
                className="pointer-events-auto absolute bottom-4 right-4 rounded-full bg-[var(--primary-color)] text-[#111827] hover:bg-[var(--primary-color)]/90"
                onClick={handleProcess}
                disabled={isUploading || !imagePreview}
              >
                <span className="material-symbols-outlined">check</span>
              </Button>

              {isUploading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0b1324]/80 px-6 text-center backdrop-blur-sm">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white/20 border-t-[var(--primary-color)] animate-spin" />
                  <p className="text-lg font-semibold text-white">
                    {t("documentScan.progress.primary")}
                    <br />
                    {t("documentScan.progress.secondary")}
                  </p>
                  <p className="mt-3 text-sm text-white/70">
                    {t("documentScan.progress.note")}
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="flex w-full max-w-xs items-center justify-between rounded-full bg-[#0b1324] p-1 text-sm font-medium">
            {(["single", "batch"] as const).map((mode) => {
              const isActive = captureMode === mode;
              const labelKey =
                mode === "single"
                  ? "documentScan.captureMode.single"
                  : "documentScan.captureMode.batch";
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
                  disabled={isUploading || mode === "batch"}
                >
                  {t(labelKey)}
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
            disabled={isUploading}
          >
            <span className="material-symbols-outlined">description</span>
          </Button>
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleGalleryFileChange}
        />
        <input
          ref={generalFileInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={handleGeneralFileChange}
        />
      </div>
    </AppLayout>
  );
};

export default DocumentScan;
