import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useApiMutation } from "../../../hooks/useApiMutation";
import { persistOcrResult } from "../storage";
import type { DocumentUploadSource } from "../types";

type UseOcrUploadOptions = {
  t: (key: string) => string;
  onError?: (message: string | null) => void;
};

type SubmitParams = {
  source: DocumentUploadSource;
  fileName: string;
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

export const useOcrUpload = ({
  t,
  onError,
}: UseOcrUploadOptions) => {
  const router = useRouter();
  const ocrMutation = useApiMutation<string, FormData>({
    path: "/multi-agent-ocr",
    method: "POST",
    config: { responseType: "text" },
  });

  const submitDocumentForOcr = useCallback(
    async (file: Blob | File, { source, fileName }: SubmitParams) => {
      ocrMutation.reset();
      onError?.(null);

      try {
        const formData = new FormData();
        formData.append("file", file, fileName);
        formData.append("source", source);
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
        onError?.(
          normalizedError.message || t("documentScan.errors.uploadFailed")
        );
      }
    },
    [ocrMutation, onError, router, t]
  );

  const processImageDataUrl = useCallback(
    async (
      dataUrl: string,
      source: DocumentUploadSource = "camera_capture"
    ) => {
      const blob = dataUrlToBlob(dataUrl);
      const extension = blob.type.split("/")[1] || "png";
      await submitDocumentForOcr(blob, {
        source,
        fileName:
          source === "camera_capture"
            ? `scanned_image.${extension}`
            : `uploaded_image.${extension}`,
      });
    },
    [submitDocumentForOcr]
  );

  return {
    isUploading: ocrMutation.isPending,
    submitDocumentForOcr,
    processImageDataUrl,
  };
};

