"use client";

import { useCallback } from "react";

import { useApiMutation } from "../../../hooks/useApiMutation";

type ConfirmOcrAction = "accept" | "discard";

type UseConfirmOcrOptions = {
  t: (key: string) => string;
  onError?: (message: string | null) => void;
};

export const useConfirmOcr = ({ t, onError }: UseConfirmOcrOptions) => {
  const confirmMutation = useApiMutation<string, { action: ConfirmOcrAction }>({
    path: "/confirm-ocr",
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
        const normalizedError =
          error instanceof Error ? error : new Error(String(error));
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
