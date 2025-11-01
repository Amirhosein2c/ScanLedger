"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useApiMutation } from "../../../hooks/useApiMutation";
import { persistOcrResult } from "../storage";
import type { DocumentUploadSource } from "../types";
import { OCR_UPLOAD_MUTATION_MOCK_RESPONSE } from "../../../mocks/mutations";
import {
  extractDocumentPayload,
  type DocumentPayload,
} from "@/src/utils/documentPayload";

// UseOcrUploadOptions describes the translation helper and optional error reporter.
type UseOcrUploadOptions = {
  t: (key: string) => string;
  onError?: (message: string | null) => void;
};

// SubmitParams captures the minimal metadata needed to label the upload request.
type SubmitParams = {
  source: DocumentUploadSource;
  fileName: string;
};

const buildUploadFormData = ({
  file,
  fileName,
  source,
}: {
  file: Blob | File;
  fileName: string;
  source: DocumentUploadSource;
}): FormData => {
  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("source", source);
  formData.append("timestamp", new Date().toISOString());
  return formData;
};

const MISSING_DOCUMENT_ID_ERROR = "MISSING_DOCUMENT_ID";

type SimplifiedPayload = Pick<
  DocumentPayload,
  "docId" | "documentClass" | "result"
>;

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

const simplifyOcrResponse = (response: unknown): SimplifiedPayload => {
  const payload = extractDocumentPayload(response);
  if (!payload) {
    throw new Error(MISSING_DOCUMENT_ID_ERROR);
  }
  return {
    docId: payload.docId,
    documentClass: payload.documentClass,
    result: payload.result,
  };
};

const parseMutationResponse = (raw: unknown): SimplifiedPayload => {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new Error(MISSING_DOCUMENT_ID_ERROR);
    }
    try {
      return simplifyOcrResponse(JSON.parse(trimmed));
    } catch (parseError) {
      console.warn("Failed to parse OCR response", parseError);
      return simplifyOcrResponse(trimmed);
    }
  }

  return simplifyOcrResponse(raw);
};

/**
 * Exposes the OCR upload workflow as a cohesive hook so view components
 * only care about their UI logic. The hook returns:
 *   - `submitDocumentForOcr`: use when you already have a `File` or `Blob`.
 *   - `processImageDataUrl`: convenience helper for base64 screenshots.
 *   - `isUploading`: a shared loading flag for disabling UI.
 */
export const useOcrUpload = ({ t, onError }: UseOcrUploadOptions) => {
  // router drives the navigation flow after a successful OCR response.
  const router = useRouter();
  // ocrMutation encapsulates the POST call to the multi-agent OCR endpoint.
  const ocrMutation = useApiMutation<string, FormData>({
    path: "/multi-agent-ocr",
    method: "POST",
    config: { responseType: "text" },
    mockResponse: OCR_UPLOAD_MUTATION_MOCK_RESPONSE,
  });

  const submitDocumentForOcr = useCallback(
    async (file: Blob | File, { source, fileName }: SubmitParams) => {
      // Reset clears previous mutation state to avoid leaking errors or spinners.
      ocrMutation.reset();
      onError?.(null);

      try {
        // formData is the multi-part payload expected by the OCR backend.
        const formData = buildUploadFormData({ file, fileName, source });
        // textBody is the raw server response (string because of responseType=text).
        const textBody = await ocrMutation.mutateAsync(formData);
        // simplified is the normalized structure stored for later editing.
        const simplified = parseMutationResponse(textBody);
        persistOcrResult(JSON.stringify(simplified));
        router.push("/documents/details");
      } catch (uploadError) {
        // normalizedError enforces a consistent Error instance across catch branches.
        const normalizedError =
          uploadError instanceof Error
            ? uploadError
            : new Error(String(uploadError));
        console.error(normalizedError);
        if (normalizedError.message === MISSING_DOCUMENT_ID_ERROR) {
          onError?.(t("documentScan.errors.missingDocumentId"));
        } else {
          onError?.(
            normalizedError.message || t("documentScan.errors.uploadFailed")
          );
        }
      }
    },
    [ocrMutation, onError, router, t]
  );

  const processImageDataUrl = useCallback(
    async (
      dataUrl: string,
      source: DocumentUploadSource = "camera_capture"
    ) => {
      // blob represents the decoded image derived from the in-memory dataUrl.
      const blob = dataUrlToBlob(dataUrl);
      // extension helps align the generated filename with the MIME type.
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
