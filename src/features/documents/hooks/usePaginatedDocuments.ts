"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStoredUserData } from "../../auth/profile";
import { useSearchDocumentsMutation } from "./useSearchDocumentsMutation";

export interface DocumentSummary {
  Document_id: string;
  OCR_DateTime?: string | null;
  Status?: string | null;
  scan_thumbnail?: string | null;
  User_ID?: string | null;
  Category?: string | null;
  __mockSequence?: string;
  [key: string]: unknown;
}

export interface DocumentSearchFilters {
  category?: string | null;
  date?: string | null;
  sort?: string | null;
  userId?: string | null;
}

interface UsePaginatedDocumentsOptions {
  pageSize?: number;
  simulateLatencyMs?: number;
  mode?: "mock" | "server";
  searchQuery?: string;
  filters?: DocumentSearchFilters;
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

const normalizeDocument = (value: unknown): DocumentSummary | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.Document_id === "string") {
    return record as DocumentSummary;
  }

  const nested = record.documents;
  if (
    nested &&
    typeof nested === "object" &&
    typeof (nested as Record<string, unknown>).Document_id === "string"
  ) {
    const docs = nested as Record<string, unknown>;
    return {
      User_ID:
        (record.User_ID as string | null | undefined) ??
        (record.userId as string | null | undefined) ??
        (record.user_id as string | null | undefined) ??
        null,
      Document_id: docs.Document_id as string,
      OCR_DateTime: docs.OCR_DateTime as string | null | undefined,
      Status: docs.Status as string | null | undefined,
      scan_thumbnail: docs.scan_thumbnail as string | null | undefined,
      Category:
        (docs.category as string | null | undefined) ??
        (docs.Category as string | null | undefined) ??
        null,
    };
  }

  return null;
};

export const usePaginatedDocuments = (
  options: UsePaginatedDocumentsOptions = {}
): UsePaginatedDocumentsResult => {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    simulateLatencyMs = DEFAULT_LATENCY_MS,
  } = options;
  const mode = options.mode ?? "mock";
  const isServerMode = mode === "server";
  const normalizedSearchQuery = useMemo(
    () => (options.searchQuery ?? "").trim(),
    [options.searchQuery]
  );
  const [searchQuery, setSearchQuery] = useState<string>(normalizedSearchQuery);
  const [baseDocuments, setBaseDocuments] = useState<DocumentSummary[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMoreState, setHasMoreState] = useState(true);
  const isLoadingRef = useRef(false);
  const cursorRef = useRef(0);
  const sequenceRef = useRef(0);
  const categoryFilter = options.filters?.category ?? null;
  const dateFilter = options.filters?.date ?? null;
  const sortFilter = options.filters?.sort ?? null;
  const userIdFilter = options.filters?.userId ?? null;
  const normalizedFilters = useMemo(
    () => ({
      category: categoryFilter,
      date: dateFilter,
      sort: sortFilter,
      userId: userIdFilter,
    }),
    [categoryFilter, dateFilter, sortFilter, userIdFilter]
  );

  const searchMutation = useSearchDocumentsMutation({
    mockResponse: isServerMode ? baseDocuments : undefined,
  });

  useEffect(() => {
    setSearchQuery((current) =>
      current === normalizedSearchQuery ? current : normalizedSearchQuery
    );
  }, [normalizedSearchQuery]);

  useEffect(() => {
    const profile = getStoredUserData();
    if (!Array.isArray(profile?.documents)) {
      setBaseDocuments([]);
      return;
    }

    const normalized = profile.documents
      .map(normalizeDocument)
      .filter(Boolean) as DocumentSummary[];
    setBaseDocuments(normalized);
  }, []);

  const filteredDocuments = useMemo(() => {
    if (isServerMode) {
      return [];
    }

    const normalized = searchQuery.toLowerCase();
    const hasQuery = Boolean(normalized);
    const normalizedCategory = normalizedFilters.category?.toLowerCase() ?? "";
    const normalizedDate = normalizedFilters.date ?? "";
    const shouldFilterCategory = Boolean(normalizedCategory);
    const shouldFilterDate = Boolean(normalizedDate);

    const filtered = baseDocuments.filter((doc) => {
      const status = typeof doc.Status === "string" ? doc.Status : "";
      const haystack = [doc.Document_id, doc.OCR_DateTime ?? "", status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !hasQuery || haystack.includes(normalized);

      if (!matchesQuery) {
        return false;
      }

      if (shouldFilterCategory) {
        const docCategory =
          (typeof doc.category === "string" && doc.category) ||
          (typeof doc.Category === "string" && doc.Category) ||
          (typeof doc.Document_Category === "string" && doc.Document_Category);
        if (!docCategory || docCategory.toLowerCase() !== normalizedCategory) {
          return false;
        }
      }

      if (shouldFilterDate) {
        const docDate =
          typeof doc.OCR_DateTime === "string" && doc.OCR_DateTime
            ? new Date(doc.OCR_DateTime).toISOString().slice(0, 10)
            : "";
        if (docDate !== normalizedDate) {
          return false;
        }
      }

      return true;
    });

    if (!normalizedFilters.sort) {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
      const aTime = a.OCR_DateTime
        ? new Date(a.OCR_DateTime).getTime()
        : Number.NEGATIVE_INFINITY;
      const bTime = b.OCR_DateTime
        ? new Date(b.OCR_DateTime).getTime()
        : Number.NEGATIVE_INFINITY;

      if (normalizedFilters.sort === "asc") {
        return aTime - bTime;
      }
      return bTime - aTime;
    });

    return sorted;
  }, [baseDocuments, isServerMode, normalizedFilters, searchQuery]);

  useEffect(() => {
    if (isServerMode) {
      cursorRef.current = 0;
      sequenceRef.current = 0;
      setDocuments([]);
      setHasMoreState(true);
    }
  }, [isServerMode, normalizedFilters, searchQuery]);

  useEffect(() => {
    if (!isServerMode) {
      cursorRef.current = 0;
      sequenceRef.current += 1;
      setDocuments([]);
    }
  }, [filteredDocuments, isServerMode]);

  const loadMoreServer = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    const offset = cursorRef.current;
    const page = Math.floor(offset / pageSize) + 1;

    try {
      const response = await searchMutation.mutateAsync({
        user_id: normalizedFilters.userId ?? undefined,
        page,
        limit: pageSize,
        category: normalizedFilters.category ?? undefined,
        date: normalizedFilters.date ?? undefined,
      });
      const payload = Array.isArray(response)
        ? response
        : Array.isArray(response?.documents)
        ? response.documents
        : Array.isArray(response?.documents)
        ? response.documents
        : [];
      const nextBatch = (payload.map(normalizeDocument).filter(Boolean) ||
        []) as DocumentSummary[];

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
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [
    normalizedFilters.category,
    normalizedFilters.date,
    normalizedFilters.userId,
    pageSize,
    searchMutation,
  ]);

  const loadMoreMock = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    if (filteredDocuments.length === 0) {
      setDocuments([]);
      setHasMoreState(false);
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    const totalRequested = Math.max(pageSize, 1);
    const startIndex = cursorRef.current;
    const sequenceSeed = sequenceRef.current;
    sequenceRef.current += 1;

    try {
      const jitter =
        simulateLatencyMs <= 0 ? 0 : simulateLatencyMs + Math.random() * 250;
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
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [filteredDocuments, pageSize, searchQuery, simulateLatencyMs]);

  const loadMore = useMemo(
    () => (isServerMode ? loadMoreServer : loadMoreMock),
    [isServerMode, loadMoreMock, loadMoreServer]
  );

  return {
    documents,
    loadMore,
    isLoading,
    hasMore: isServerMode ? hasMoreState : filteredDocuments.length > 0,
    searchQuery,
    error,
  };
};
