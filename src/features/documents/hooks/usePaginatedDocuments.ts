"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getStoredUserData } from "../../auth/profile";
import { useSearchDocumentsMutation } from "./useSearchDocumentsMutation";

export interface DocumentSummary {
  Document_id: string;
  OCR_DateTime?: string | null;
  Status?: string | null;
  scan_thumbnail?: string | null;
  [key: string]: unknown;
}

interface UsePaginatedDocumentsOptions {
  pageSize?: number;
  simulateLatencyMs?: number;
  mode?: "mock" | "server";
}

interface UsePaginatedDocumentsResult {
  documents: DocumentSummary[];
  loadMore: () => Promise<void>;
  isLoading: boolean;
  hasMore: boolean;
  searchQuery: string;
  error: Error | null;
}

const DEFAULT_PAGE_SIZE = 5;
const DEFAULT_LATENCY_MS = 450;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    setTimeout(resolve, ms);
  });

const isDocumentSummary = (value: unknown): value is DocumentSummary => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.Document_id === "string";
};

export const usePaginatedDocuments = (
  options: UsePaginatedDocumentsOptions = {}
): UsePaginatedDocumentsResult => {
  const { pageSize = DEFAULT_PAGE_SIZE, simulateLatencyMs = DEFAULT_LATENCY_MS } =
    options;
  const searchParams = useSearchParams();
  const mode = options.mode ?? "mock";
  const isServerMode = mode === "server";
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    const initialValue = searchParams?.get("documents")?.trim() ?? "";
    return initialValue;
  });
  const [baseDocuments, setBaseDocuments] = useState<DocumentSummary[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMoreState, setHasMoreState] = useState(true);
  const cursorRef = useRef(0);
  const sequenceRef = useRef(0);

  const searchMutation = useSearchDocumentsMutation({
    mockResponse: isServerMode ? baseDocuments : undefined,
  });

  useEffect(() => {
    const nextQuery = searchParams?.get("documents")?.trim() ?? "";
    setSearchQuery((current) => (current === nextQuery ? current : nextQuery));
  }, [searchParams]);

  useEffect(() => {
    const profile = getStoredUserData();
    if (!Array.isArray(profile?.documents)) {
      setBaseDocuments([]);
      return;
    }

    const normalized = profile.documents.filter(isDocumentSummary);
    setBaseDocuments(normalized);
  }, []);

  const filteredDocuments = useMemo(() => {
    if (isServerMode) {
      return [];
    }
    if (!searchQuery) {
      return baseDocuments;
    }

    const normalized = searchQuery.toLowerCase();
    return baseDocuments.filter((doc) => {
      const status = typeof doc.Status === "string" ? doc.Status : "";
      const haystack = [doc.Document_id, doc.OCR_DateTime ?? "", status]
        .filter(Boolean)
        .join(" ")
          .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [baseDocuments, isServerMode, searchQuery]);

  useEffect(() => {
    if (isServerMode) {
      cursorRef.current = 0;
      sequenceRef.current = 0;
      setDocuments([]);
      setHasMoreState(true);
    }
  }, [isServerMode, searchQuery]);

  useEffect(() => {
    if (!isServerMode) {
      cursorRef.current = 0;
      sequenceRef.current += 1;
      setDocuments([]);
    }
  }, [filteredDocuments, isServerMode]);

  const loadMore = useCallback(async () => {
    if (isLoading) {
      return;
    }

    if (isServerMode) {
      setIsLoading(true);
      setError(null);
      const offset = cursorRef.current;

      try {
        const response = await searchMutation.mutateAsync({
          documents: searchQuery || undefined,
          limit: pageSize,
          offset,
        });
        const nextBatch = Array.isArray(response)
          ? response.filter(isDocumentSummary)
          : [];

        setDocuments((prev) => [...prev, ...nextBatch]);
        cursorRef.current = offset + nextBatch.length;
        setHasMoreState(nextBatch.length >= pageSize);
      } catch (unknownError) {
        const fallbackError =
          unknownError instanceof Error
            ? unknownError
            : new Error("Failed to load documents");
        setError(fallbackError);
        setHasMoreState(false);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (filteredDocuments.length === 0) {
      setDocuments([]);
      setHasMoreState(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const totalRequested = Math.max(pageSize, 1);
    const startIndex = cursorRef.current;
    const sequenceSeed = sequenceRef.current;
    sequenceRef.current += 1;

    try {
      const jitter =
        simulateLatencyMs <= 0
          ? 0
          : simulateLatencyMs + Math.random() * 250;
      await wait(Math.max(0, jitter));

      const nextBatch: DocumentSummary[] = [];
      for (let i = 0; i < totalRequested; i += 1) {
        const sourceIndex = (startIndex + i) % filteredDocuments.length;
        const source = filteredDocuments[sourceIndex];
        if (!source) {
          break;
        }

        const sequence = `${sequenceSeed}-${startIndex + i}`;
        nextBatch.push({ ...source, __mockSequence: sequence });
      }

      cursorRef.current = startIndex + nextBatch.length;
      setDocuments((prev) => [...prev, ...nextBatch]);
      setHasMoreState(filteredDocuments.length > 0);
    } catch (unknownError) {
      const fallbackError =
        unknownError instanceof Error
          ? unknownError
          : new Error("Failed to load documents");
      setError(fallbackError);
    } finally {
      setIsLoading(false);
    }
  }, [
    filteredDocuments,
    isLoading,
    isServerMode,
    pageSize,
    searchMutation,
    searchQuery,
    simulateLatencyMs,
  ]);

  return {
    documents,
    loadMore,
    isLoading,
    hasMore: isServerMode ? hasMoreState : filteredDocuments.length > 0,
    searchQuery,
    error,
  };
};
