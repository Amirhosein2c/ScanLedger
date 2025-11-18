"use client";

import { useMemo } from "react";
import { useApiMutation } from "@/src/hooks/useApiMutation";
import type { DocumentSummary } from "./usePaginatedDocuments";

interface SearchDocumentsPayload {
  user_id?: string | null;
  page?: number;
  limit?: number;
  category?: string | null;
  date?: string | null;
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

  return useApiMutation<DocumentSummary, SearchDocumentsPayload>({
    path: "/documents-retrieval",
    method: "POST",
    mockResponse,
  });
};
