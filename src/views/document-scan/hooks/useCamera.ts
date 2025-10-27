import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ensurePreferredRearCameraStream,
  normalizeCameraError,
  requestCameraStream,
  stopMediaStream,
} from "../cameraUtils";

type UseCameraOptions = {
  t: (key: string) => string;
  onError?: (message: string | null) => void;
};

type UseCameraResult = {
  videoRef: RefObject<HTMLVideoElement>;
  isCameraReady: boolean;
  cameraError: string | null;
  isFlashOn: boolean;
  isTorchAvailable: boolean;
  isTogglingFlash: boolean;
  toggleFlash: () => Promise<void>;
  captureImage: () => string | null;
  resetCamera: () => void;
  resumeCamera: () => void;
  clearCameraError: () => void;
};

export const useCamera = ({ t, onError }: UseCameraOptions): UseCameraResult => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isComponentActiveRef = useRef(true);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);
  const [isTogglingFlash, setIsTogglingFlash] = useState(false);

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

  const cleanupCurrentStream = useCallback(() => {
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    updateTorchAvailability(null);
    setIsCameraReady(false);
  }, [updateTorchAvailability]);

  const initCamera = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    cleanupCurrentStream();
    setCameraError(null);

    const hostname = window.location.hostname;
    const isSecure =
      window.isSecureContext || window.location.protocol === "https:";

    try {
      let stream = await requestCameraStream(isSecure, hostname);

      if (!isComponentActiveRef.current) {
        stopMediaStream(stream);
        return;
      }

      const preferredStream = await ensurePreferredRearCameraStream(stream);
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
  }, [attachStreamToVideo, cleanupCurrentStream, updateTorchAvailability]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    isComponentActiveRef.current = true;
    void initCamera();

    return () => {
      isComponentActiveRef.current = false;
      cleanupCurrentStream();
    };
  }, [cleanupCurrentStream, initCamera]);

  const resumeCamera = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) {
      return;
    }
    attachStreamToVideo(stream);
  }, [attachStreamToVideo]);

  const resetCamera = useCallback(() => {
    cleanupCurrentStream();
    isComponentActiveRef.current = true;
    setCameraError(null);
    void initCamera();
  }, [cleanupCurrentStream, initCamera]);

  const toggleFlash = useCallback(async () => {
    if (isTogglingFlash) {
      return;
    }

    const stream = streamRef.current;
    const [track] = stream?.getVideoTracks() ?? [];
    if (!stream || !track) {
      onError?.(t("documentScan.errors.flashUnavailable"));
      return;
    }

    if (typeof track.getCapabilities !== "function") {
      onError?.(t("documentScan.errors.flashUnsupported"));
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
      onError?.(t("documentScan.errors.flashUnsupported"));
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
      onError?.(t("documentScan.errors.flashToggleFailed"));
      updateTorchAvailability(streamRef.current);
    } finally {
      setIsTogglingFlash(false);
    }
  }, [
    isFlashOn,
    isTogglingFlash,
    onError,
    t,
    updateTorchAvailability,
  ]);

  const captureImage = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      onError?.(t("documentScan.errors.cameraNotReady"));
      return null;
    }

    if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      onError?.(t("documentScan.errors.cameraInitializing"));
      return null;
    }

    if (!canvasRef.current && typeof document !== "undefined") {
      canvasRef.current = document.createElement("canvas");
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      onError?.(t("documentScan.errors.captureFailed"));
      return null;
    }

    canvas.width = videoElement.videoWidth || 1080;
    canvas.height = videoElement.videoHeight || 1440;

    const context = canvas.getContext("2d");
    if (!context) {
      onError?.(t("documentScan.errors.captureFailed"));
      return null;
    }

    context.drawImage(
      videoElement,
      0,
      0,
      canvas.width,
      canvas.height
    );

    try {
      return canvas.toDataURL("image/png");
    } catch (captureError) {
      console.error(captureError);
      onError?.(t("documentScan.errors.captureException"));
      return null;
    }
  }, [onError, t]);

  const clearCameraError = useCallback(() => {
    setCameraError(null);
  }, []);

  return {
    videoRef,
    isCameraReady,
    cameraError,
    isFlashOn,
    isTorchAvailable,
    isTogglingFlash,
    toggleFlash,
    captureImage,
    resetCamera,
    resumeCamera,
    clearCameraError,
  };
};
