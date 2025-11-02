"use client";

import { useMemo } from "react";
import { useApiMutation } from "@/src/hooks/useApiMutation";
import type { DocumentSummary } from "./usePaginatedDocuments";

interface SearchDocumentsPayload {
  documents?: string;
  limit?: number;
  offset?: number;
}

interface UseSearchDocumentsMutationOptions {
  mockResponse?: DocumentSummary[] | null;
}

export const useSearchDocumentsMutation = (
  options: UseSearchDocumentsMutationOptions = {}
) => {
  const mockResponse = useMemo(() => {
    if (!options.mockResponse || options.mockResponse.length === 0) {
      return undefined;
    }
    return options.mockResponse;
  }, [options.mockResponse]);

  return useApiMutation<DocumentSummary[], SearchDocumentsPayload>({
    path: "/documents",
    method: "GET",
    mockResponse,
  });
};
