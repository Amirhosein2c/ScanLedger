"use client";

import { useCallback } from "react";

import { useApiMutation } from "../../../hooks/useApiMutation";

type ConfirmOcrAction = "accept" | "discard";

type UseConfirmOcrOptions = {
  t: (key: string) => string;
  onError?: (message: string | null) => void;
};

type ConfirmOcrPayload = { action: ConfirmOcrAction };

// normalizeMutationError makes sure downstream consumers always receive an Error instance.
const normalizeMutationError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }
  return new Error(String(value));
};

/**
 * Shared confirmation hook for OCR actions. Keeps mutation plumbing close to
 * the view layer while the heavy lifting (URL building, request execution)
 * remains inside `useApiMutation`.
 *
 * The intent is that future confirmation flows can follow the same pattern:
 * create a domain hook that exposes small intent-driven helpers (`saveOcr`,
 * `discardOcr`) instead of leaking `mutateAsync` through the entire app.
 */
export const useConfirmOcr = ({ t, onError }: UseConfirmOcrOptions) => {
  // confirmMutation handles the POST call to the confirmation endpoint.
  const confirmMutation = useApiMutation<string, ConfirmOcrPayload>({
    path: "/multi-agent-ocr/confirm-ocr",
    method: "POST",
    config: { responseType: "text" },
  });

  const confirmOcr = useCallback(
    async (action: ConfirmOcrAction) => {
      // reset ensures previous state (errors/loading) does not leak into a new attempt.
      confirmMutation.reset();
      onError?.(null);

      try {
        // result carries the raw API payload; the caller can react to it if needed.
        return await confirmMutation.mutateAsync({ action });
      } catch (error) {
        const normalizedError = normalizeMutationError(error);
        console.error(normalizedError);
        onError?.(
          normalizedError.message || t("documentDetails.messages.saveFailed")
        );
        throw normalizedError;
      }
    },
    [confirmMutation, onError, t]
  );

  // saveOcr is the user-facing helper for accepting a document.
  const saveOcr = useCallback(() => confirmOcr("accept"), [confirmOcr]);

  // discardOcr mirrors saveOcr but issues a discard confirmation.
  const discardOcr = useCallback(() => confirmOcr("discard"), [confirmOcr]);

  return {
    saveOcr,
    discardOcr,
    isConfirming: confirmMutation.isPending,
  };
};
