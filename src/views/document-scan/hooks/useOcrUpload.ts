"use client";

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

type SimplifiedPayload = {
  docId: string;
  documentClass: string;
  result: Record<string, string>;
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

const emptyPayload: SimplifiedPayload = {
  docId: "",
  documentClass: "",
  result: {},
};

const generateDocId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}`;
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

const toRecord = (source: unknown): Record<string, string> => {
  if (!source) {
    return {};
  }

  if (typeof source === "string") {
    try {
      const parsed = JSON.parse(source);
      return toRecord(parsed);
    } catch {
      return {};
    }
  }

  if (Array.isArray(source)) {
    return source.reduce<Record<string, string>>((acc, item) => {
      if (!item || typeof item !== "object") {
        return acc;
      }
      const entry = item as Record<string, unknown>;
      const labelRaw =
        entry.label ?? entry.name ?? entry.key ?? entry.field ?? null;
      const label =
        typeof labelRaw === "string"
          ? labelRaw.trim()
          : labelRaw != null
          ? String(labelRaw).trim()
          : "";
      if (!label) {
        return acc;
      }
      const valueSource =
        entry.value ?? entry.text ?? entry.raw ?? entry.content ?? "";
      acc[label] =
        typeof valueSource === "string"
          ? valueSource
          : valueSource != null
          ? String(valueSource)
          : "";
      return acc;
    }, {});
  }

  if (typeof source === "object") {
    return Object.entries(source as Record<string, unknown>).reduce<
      Record<string, string>
    >((acc, [label, value]) => {
      const normalizedLabel =
        typeof label === "string" ? label.trim() : String(label).trim();
      if (!normalizedLabel) {
        return acc;
      }
      acc[normalizedLabel] = value != null ? String(value) : "";
      return acc;
    }, {});
  }

  return {};
};

const simplifyOcrResponse = (response: unknown): SimplifiedPayload => {
  const normalize = (input: unknown): Record<string, unknown> | null => {
    if (!input) {
      return null;
    }
    if (typeof input === "string") {
      try {
        const parsed = JSON.parse(input);
        return normalize(parsed);
      } catch {
        return null;
      }
    }
    if (Array.isArray(input)) {
      const candidate = input.find(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object"
      );
      return candidate ? candidate : null;
    }
    if (typeof input === "object") {
      return input as Record<string, unknown>;
    }
    return null;
  };

  const record = normalize(response);
  if (!record) {
    return emptyPayload;
  }

  const documentClassRaw =
    record.documentClass ??
    record.document_class ??
    record.type ??
    record.document_type ??
    "";

  const resultSource =
    record.result ??
    record.fields ??
    record.display_fields ??
    record.data ??
    record.raw ??
    {};

  const documentClass =
    typeof documentClassRaw === "string"
      ? documentClassRaw.trim()
      : documentClassRaw != null
      ? String(documentClassRaw).trim()
      : "";
  const docIdRaw =
    record.docId ??
    record.doc_id ??
    record.documentId ??
    record.document_id ??
    "";
  const docId =
    typeof docIdRaw === "string"
      ? docIdRaw.trim()
      : docIdRaw != null
      ? String(docIdRaw).trim()
      : "";

  return {
    docId: docId || generateDocId(),
    documentClass,
    result: toRecord(resultSource),
  };
};

const parseMutationResponse = (raw: unknown): SimplifiedPayload => {
  if (typeof raw === "string") {
    try {
      return simplifyOcrResponse(JSON.parse(raw));
    } catch (parseError) {
      console.warn("Failed to parse OCR response", parseError);
      return emptyPayload;
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
        const formData = buildUploadFormData({ file, fileName, source });
        const textBody = await ocrMutation.mutateAsync(formData);
        const simplified = parseMutationResponse(textBody);
        persistOcrResult(JSON.stringify(simplified));
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
