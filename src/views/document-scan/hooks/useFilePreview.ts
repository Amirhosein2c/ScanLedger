import { useCallback, useState } from "react";

import {
  clearPersistedImageData,
  persistImageDataUrl,
} from "../storage";
import type { DocumentUploadSource } from "../types";

type UseFilePreviewOptions = {
  t: (key: string) => string;
  onError?: (message: string | null) => void;
  onProcessImageDataUrl?: (
    dataUrl: string,
    source: DocumentUploadSource
  ) => Promise<void>;
};

type ReadFileOptions = {
  autoProcess?: boolean;
  source?: Exclude<DocumentUploadSource, "camera_capture">;
};

type UseFilePreviewResult = {
  imagePreview: string | null;
  imagePreviewSource: DocumentUploadSource;
  pendingFileUpload: File | null;
  setPreview: (dataUrl: string, source?: DocumentUploadSource) => void;
  clearPreview: () => void;
  readFileAsPreview: (file: File, options?: ReadFileOptions) => Promise<void>;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unexpected file reader result."));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Unable to read file."));
    };
    reader.readAsDataURL(file);
  });

export const useFilePreview = ({
  t,
  onError,
  onProcessImageDataUrl,
}: UseFilePreviewOptions): UseFilePreviewResult => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePreviewSource, setImagePreviewSource] =
    useState<DocumentUploadSource>("camera_capture");
  const [pendingFileUpload, setPendingFileUpload] = useState<File | null>(null);

  const setPreview = useCallback(
    (dataUrl: string, source: DocumentUploadSource = "camera_capture") => {
      setImagePreview(dataUrl);
      setImagePreviewSource(source);
      setPendingFileUpload(null);
      onError?.(null);
      persistImageDataUrl(dataUrl);
    },
    [onError]
  );

  const clearPreview = useCallback(() => {
    setImagePreview(null);
    setImagePreviewSource("camera_capture");
    setPendingFileUpload(null);
    clearPersistedImageData();
  }, []);

  const readFileAsPreview = useCallback(
    async (
      file: File,
      {
        autoProcess = false,
        source = "gallery_upload",
      }: ReadFileOptions = {}
    ) => {
      if (file.type === "application/pdf") {
        try {
          const { convertPdfToImage } = await import("../../../utils/pdf");
          const { dataUrl } = await convertPdfToImage(file);

          setPendingFileUpload(null);
          setPreview(dataUrl, source);

          if (autoProcess && onProcessImageDataUrl) {
            await onProcessImageDataUrl(dataUrl, source);
          }
        } catch (conversionError) {
          console.error(conversionError);
          clearPreview();
          onError?.(t("documentScan.errors.pdfConversionFailed"));
        }
        return;
      }

      if (!file.type.startsWith("image/")) {
        clearPersistedImageData();
        setImagePreview(null);
        setImagePreviewSource("camera_capture");
        setPendingFileUpload(file);
        onError?.(null);
        return;
      }

      setPendingFileUpload(null);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setPreview(dataUrl, source);

        if (autoProcess && onProcessImageDataUrl) {
          await onProcessImageDataUrl(dataUrl, source);
        }
      } catch (readError) {
        console.error(readError);
        onError?.(t("documentScan.errors.readImageFailed"));
      }
    },
    [
      clearPreview,
      onError,
      onProcessImageDataUrl,
      setPreview,
      t,
    ]
  );

  return {
    imagePreview,
    imagePreviewSource,
    pendingFileUpload,
    setPreview,
    clearPreview,
    readFileAsPreview,
  };
};

