import { translate } from "@/src/lib/i18n";
import {
  getPreferredCameraDeviceId,
  setPreferredCameraDeviceId,
} from "./storage";

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

export const SECURE_CONTEXT_MESSAGE_KEY = "documentScan.errors.secureContext";

export const isLoopbackHost = (normalizedHost: string) =>
  normalizedHost === "localhost" ||
  normalizedHost === "127.0.0.1" ||
  normalizedHost === "[::1]" ||
  normalizedHost === "0.0.0.0";

export const ensureSecureCameraContext = (
  isSecure: boolean,
  hostname: string
) => {
  if (!isSecure && !isLoopbackHost(hostname.toLowerCase())) {
    throw new Error(translate(SECURE_CONTEXT_MESSAGE_KEY));
  }
};

export const stopMediaStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const buildCameraConstraints = (
  deviceId?: string
): MediaStreamConstraints => {
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

export const getUserMediaPromise = (
  constraints: MediaStreamConstraints
): Promise<MediaStream> => {
  if (
    typeof navigator !== "undefined" &&
    navigator.mediaDevices?.getUserMedia
  ) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

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

export const requestCameraStream = async (
  isSecure: boolean,
  hostname: string
) => {
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

export const normalizeCameraError = (
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

export const ensurePreferredRearCameraStream = async (
  stream: MediaStream
) => ensurePreferredRearCamera(stream);

