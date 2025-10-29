const PREFERRED_CAMERA_STORAGE_KEY: string = "preferredRearCameraDeviceId";
const IMAGE_DATA_STORAGE_KEY: string = "scannedImageDataUrl";
export const OCR_RESULT_STORAGE_KEY: string = "ocrResultData";

const hasWindow = () => typeof window !== "undefined";

const readStorageValue = (storage: Storage | undefined, key: string) => {
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(key);
  } catch (storageError) {
    console.warn(`Unable to read ${key} from storage`, storageError);
    return null;
  }
};

const writeStorageValue = (
  storage: Storage | undefined,
  key: string,
  value: string | null
) => {
  if (!storage) {
    return;
  }
  try {
    if (value === null) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  } catch (storageError) {
    console.warn(`Unable to persist ${key} in storage`, storageError);
  }
};

export const getPreferredCameraDeviceId = () => {
  if (!hasWindow()) {
    return null;
  }
  return (
    readStorageValue(window.localStorage, PREFERRED_CAMERA_STORAGE_KEY) ?? null
  );
};

export const setPreferredCameraDeviceId = (deviceId: string) => {
  if (!hasWindow()) {
    return;
  }
  writeStorageValue(
    window.localStorage,
    PREFERRED_CAMERA_STORAGE_KEY,
    deviceId
  );
};

export const persistImageDataUrl = (dataUrl: string) => {
  if (!hasWindow()) {
    return;
  }
  writeStorageValue(window.sessionStorage, IMAGE_DATA_STORAGE_KEY, dataUrl);
  writeStorageValue(window.localStorage, IMAGE_DATA_STORAGE_KEY, dataUrl);
};

export const getPersistedImageDataUrl = () => {
  if (!hasWindow()) {
    return null;
  }
  return (
    readStorageValue(window.sessionStorage, IMAGE_DATA_STORAGE_KEY) ??
    readStorageValue(window.localStorage, IMAGE_DATA_STORAGE_KEY) ??
    null
  );
};

export const clearPersistedImageData = () => {
  if (!hasWindow()) {
    return;
  }
  writeStorageValue(window.sessionStorage, IMAGE_DATA_STORAGE_KEY, null);
  writeStorageValue(window.localStorage, IMAGE_DATA_STORAGE_KEY, null);
};

export const persistOcrResult = (payload: string | null) => {
  if (!hasWindow()) {
    return;
  }
  writeStorageValue(window.sessionStorage, OCR_RESULT_STORAGE_KEY, payload);
  writeStorageValue(window.localStorage, OCR_RESULT_STORAGE_KEY, payload);
};

export const getPersistedOcrResult = () => {
  if (!hasWindow()) {
    return null;
  }
  return (
    readStorageValue(window.sessionStorage, OCR_RESULT_STORAGE_KEY) ??
    readStorageValue(window.localStorage, OCR_RESULT_STORAGE_KEY) ??
    null
  );
};

export const clearPersistedOcrResult = () => {
  if (!hasWindow()) {
    return;
  }
  writeStorageValue(window.sessionStorage, OCR_RESULT_STORAGE_KEY, null);
  writeStorageValue(window.localStorage, OCR_RESULT_STORAGE_KEY, null);
};
