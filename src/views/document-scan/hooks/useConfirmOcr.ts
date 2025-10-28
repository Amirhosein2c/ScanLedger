"use client";

import { useCallback } from "react";

import { useApiMutation } from "../../../hooks/useApiMutation";

type ConfirmOcrAction = "accept" | "discard";

type UseConfirmOcrOptions = {
  t: (key: string) => string;
  onError?: (message: string | null) => void;
};

type ConfirmOcrPayload = { action: ConfirmOcrAction };

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
  const confirmMutation = useApiMutation<string, ConfirmOcrPayload>({
    path: "/multi-agent-ocr/confirm-ocr",
    method: "POST",
    config: { responseType: "text" },
  });

  const confirmOcr = useCallback(
    async (action: ConfirmOcrAction) => {
      confirmMutation.reset();
      onError?.(null);

      try {
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

  const saveOcr = useCallback(() => confirmOcr("accept"), [confirmOcr]);

  const discardOcr = useCallback(() => confirmOcr("discard"), [confirmOcr]);

  return {
    saveOcr,
    discardOcr,
    isConfirming: confirmMutation.isPending,
  };
};
