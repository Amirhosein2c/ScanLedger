"use client";

import type { FC, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import AppLayout from "../components/layout/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";
import { AppIcon } from "@/src/components/AppIcon";
import DocumentRow from "@/src/components/documents/DocumentRow";
import { getStoredUserId } from "../features/auth/profile";
import { usePaginatedDocuments } from "../features/documents/hooks/usePaginatedDocuments";

const documentsMode =
  process.env.NEXT_PUBLIC_DOCUMENTS_MODE === "mock" ? "mock" : "server";

const DocumentSkeleton: FC = () => (
  <Card className="bg-[#1F2937]">
    <CardContent className="flex items-center gap-4 p-3">
      <div className="size-14 rounded-lg bg-[#273248] animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-4/5 rounded bg-white/20 animate-pulse" />
        <div className="h-3 w-3/5 rounded bg-white/10 animate-pulse" />
      </div>
      {/* <div className="h-3 w-14 rounded bg-white/10 animate-pulse" /> */}
    </CardContent>
  </Card>
);

const DocumentManagementSearch = () => {
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();
  const router = useRouter();
  // Search input is intentionally disabled; leaving previous query plumbing commented for future use.
  // const searchParams = useSearchParams();
  // const searchParamsString = searchParams?.toString() ?? "";
  // const initialQuery = searchParams?.get("documents") ?? "";
  // const [query, setQuery] = useState<string>(initialQuery);
  // const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery);
  const debouncedQuery = "";
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [userId, setUserId] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState<"date" | "category" | null>(
    null
  );
  const [isClient, setIsClient] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const filterAnchorsRef = useRef<
    Record<"date" | "category", HTMLButtonElement | null>
  >({
    date: null,
    category: null,
  });
  const categoryOptions = useMemo(
    () => [
      { value: "groceries", label: t("documents.categories.groceries") },
      { value: "transport", label: t("documents.categories.transport") },
      {
        value: "entertainment",
        label: t("documents.categories.entertainment"),
      },
      { value: "foodDrink", label: t("documents.categories.foodDrink") },
    ],
    [t]
  );
  const filters = useMemo(
    () => ({
      category: selectedCategory,
      date: selectedDate,
      sort: sortOrder,
      userId,
    }),
    [selectedCategory, selectedDate, sortOrder, userId]
  );

  useEffect(() => {
    setUserId(getStoredUserId());
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateDropdownPosition = useCallback(
    (targetFilter?: "date" | "category") => {
      if (typeof window === "undefined") {
        return;
      }
      const activeFilter = targetFilter ?? openFilter;
      if (!activeFilter) {
        setDropdownPosition(null);
        return;
      }
      const anchor = filterAnchorsRef.current[activeFilter];
      if (!anchor) {
        setDropdownPosition(null);
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const viewportLeft = window.scrollX;
      const viewportRight = viewportLeft + window.innerWidth;
      const dropdownWidth = Math.max(rect.width, 224);
      const desiredLeft = rect.left + window.scrollX;
      const maxLeft = viewportRight - dropdownWidth - 16;
      const computedLeft = Math.max(
        viewportLeft + 16,
        Math.min(desiredLeft, maxLeft)
      );

      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: computedLeft,
        width: dropdownWidth,
      });
    },
    [openFilter]
  );

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      const isAnchor = Object.values(filterAnchorsRef.current).some(
        (anchor) => anchor && anchor.contains(target)
      );
      if (isAnchor) {
        return;
      }
      if (dropdownRef.current?.contains(target)) {
        return;
      }
      setOpenFilter(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!openFilter) {
      setDropdownPosition(null);
      return;
    }
    updateDropdownPosition();
  }, [openFilter, updateDropdownPosition]);

  useEffect(() => {
    if (!openFilter) {
      return;
    }
    const handleWindowChange = () => {
      updateDropdownPosition();
    };
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);
    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [openFilter, updateDropdownPosition]);

  const { documents, loadMore, isLoading, hasMore, error } =
    usePaginatedDocuments({
      pageSize: 5,
      mode: documentsMode,
      searchQuery: debouncedQuery,
      filters,
    });
  const lastFilterRequestRef = useRef<string>("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Legacy search query syncing is kept commented for future reinstatement when a search box returns.
  /*
  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const nextQuery = params.get("documents") ?? "";
    setQuery((current) => (current === nextQuery ? current : nextQuery));
    setDebouncedQuery((current) =>
      current === nextQuery ? current : nextQuery
    );
  }, [searchParamsString]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery((current) =>
        current === query.trim() ? current : query.trim()
      );
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const currentQueryParam = params.get("documents") ?? "";
    if (debouncedQuery === currentQueryParam) {
      return;
    }
    if (debouncedQuery) {
      params.set("documents", debouncedQuery);
    } else {
      params.delete("documents");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }, [debouncedQuery, pathname, router, searchParamsString]);
  */

  useEffect(() => {
    // Trigger retrieval on initial load or whenever the active filters change.
    const filterKey = `${selectedCategory ?? "none"}|${selectedDate ?? "none"}`;
    const filtersChanged = filterKey !== lastFilterRequestRef.current;
    if (filtersChanged) {
      lastFilterRequestRef.current = filterKey;
    }

    const shouldLoad =
      (documents?.length === 0 || filtersChanged) && hasMore && !isLoading;
    if (!shouldLoad) {
      return;
    }

    void loadMore();
  }, [
    documents?.length,
    hasMore,
    isLoading,
    loadMore,
    selectedCategory,
    selectedDate,
  ]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }

    const sentinel = loadMoreRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          void loadMore();
        }
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, documents?.length]);

  const formattedDateLabel = useMemo(() => {
    if (!selectedDate) {
      return "";
    }
    const parsedDate = new Date(selectedDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return selectedDate;
    }
    return parsedDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategory) {
      return "";
    }
    const option = categoryOptions.find(
      (item) => item.value === selectedCategory
    );
    return option?.label ?? selectedCategory;
  }, [categoryOptions, selectedCategory]);

  const sortLabel =
    sortOrder === "desc"
      ? t("documents.sort.newest")
      : t("documents.sort.oldest");
  const dropdownContent =
    openFilter === "date" ? (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate ?? ""}
            onChange={(event) => {
              const value = event.target.value || null;
              setSelectedDate(value);
              setOpenFilter(null);
            }}
            className="w-full rounded-lg bg-[#111827] p-2 text-sm text-white outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80"
          />
          {selectedDate && (
            <button
              type="button"
              aria-label={t("documents.filters.clear")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              onClick={() => {
                setSelectedDate(null);
                setOpenFilter(null);
              }}
            >
              <AppIcon name="close" className="h-4 w-4" />
            </button>
          )}
        </div>
        {!selectedDate && (
          <p className="text-xs text-[#9CA3AF]">
            {t("documents.filters.date")}
          </p>
        )}
      </div>
    ) : openFilter === "category" ? (
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-xs uppercase tracking-wide text-[#9CA3AF]">
            {t("documents.filters.category")}
          </span>
          {selectedCategory && (
            <button
              type="button"
              aria-label={t("documents.filters.clear")}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              onClick={() => {
                setSelectedCategory(null);
                setOpenFilter(null);
              }}
            >
              <AppIcon name="close" className="h-4 w-4" />
            </button>
          )}
        </div>
        {categoryOptions.map((category) => {
          const isSelected = selectedCategory === category.value;
          return (
            <button
              type="button"
              key={category.value}
              onClick={() => {
                setSelectedCategory(category.value);
                setOpenFilter(null);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                isSelected
                  ? "bg-white/10 text-white"
                  : "text-[#D1D5DB] hover:bg-white/5"
              }`}
            >
              <span>{category.label}</span>
              {isSelected && (
                <AppIcon
                  name="check"
                  className="h-4 w-4 text-[var(--primary-color)]"
                />
              )}
            </button>
          );
        })}
      </div>
    ) : null;
  const dropdown =
    isClient && openFilter && dropdownContent && dropdownPosition
      ? createPortal(
          <div className="fixed inset-0 z-[60] pointer-events-none">
            <div
              ref={dropdownRef}
              className="pointer-events-auto rounded-xl border border-white/5 bg-[#1F2937] p-4 shadow-2xl"
              style={{
                position: "absolute",
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                minWidth: dropdownPosition.width,
                maxWidth: 320,
              }}
            >
              {dropdownContent}
            </div>
          </div>,
          document.body
        )
      : null;

  const handleFilterButtonClick = (
    event: MouseEvent<HTMLButtonElement>,
    filter: "date" | "category"
  ) => {
    event.preventDefault();
    setOpenFilter((current) => (current === filter ? null : filter));
    requestAnimationFrame(() => updateDropdownPosition(filter));
  };

  const header = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-12" />
        <h2 className="text-lg font-bold">{t("documents.header.title")}</h2>
        <div className="flex w-12 items-center justify-end">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="rounded-full hover:bg-white/10"
            title={t("documents.actions.add")}
          >
            <AppIcon name="add" className="h-7 w-7" />
          </Button>
        </div>
      </div>
      {/* Search input preserved for future use; currently disabled alongside its logic. */}
      {/* <div className="relative">
        <AppIcon
          name="search"
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#96c5a9]"
        />
        <Input
          className="h-12 pl-11 pr-4 text-base"
          placeholder={t("documents.search.placeholder")}
          value={query}
          onChange={handleQueryChange}
        />
      </div> */}
      <div className="flex gap-2 overflow-x-auto">
        {(["date", "category"] as const).map((filter) => {
          const isDateFilter = filter === "date";
          const active =
            (isDateFilter && Boolean(selectedDate)) ||
            (!isDateFilter && Boolean(selectedCategory));
          const label = isDateFilter
            ? formattedDateLabel || t("documents.filters.date")
            : selectedCategoryLabel || t("documents.filters.category");

          return (
            <div key={filter}>
              <Button
                ref={(node) => {
                  filterAnchorsRef.current[filter] = node;
                }}
                type="button"
                variant="secondary"
                size="sm"
                onClick={(event) => handleFilterButtonClick(event, filter)}
                className={`h-10 shrink-0 gap-x-2 rounded-full text-sm text-white ${
                  active ? "bg-white/20" : "bg-[#1F2937]"
                } hover:bg-white/10`}
              >
                <span className="max-w-[140px] truncate text-left">
                  {label}
                </span>
                <AppIcon
                  name="keyboard_arrow_down"
                  className={`h-5 w-5 transition-transform ${
                    openFilter === filter ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {dropdown}
      <AppLayout
        header={header}
        className="bg-[#111827] text-white"
        contentClassName="flex flex-col gap-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {t("documents.sections.recent")}
          </h3>
          <Button
            type="button"
            variant="ghost"
            className="gap-1 text-[var(--primary-color)] hover:bg-white/5"
            onClick={() =>
              setSortOrder((current) => (current === "desc" ? "asc" : "desc"))
            }
          >
            <span>
              {t("documents.actions.sort")}: {sortLabel}
            </span>
            <AppIcon name="swap_vert" className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-2 pb-6">
          {!hasMore && !isLoading && documents?.length === 0 && (
            <p className="text-sm text-gray-400">
              {t("documents.search.empty")}
            </p>
          )}
          {documents?.map((document, index) => {
            const sequence =
              typeof document.__mockSequence === "string"
                ? document.__mockSequence
                : index;
            const key = `${document.Document_id}-${sequence}`;
            return (
              <DocumentRow
                key={key}
                document={document}
                onSelect={() => {
                  router.push(
                    `/documents/details?id=${encodeURIComponent(
                      document.Document_id
                    )}`
                  );
                }}
              />
            );
          })}
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error.message}
            </p>
          )}
          {isLoading &&
            Array.from({ length: documents?.length === 0 ? 3 : 1 }).map(
              (_, index) => <DocumentSkeleton key={`skeleton-${index}`} />
            )}
          <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
        </div>
      </AppLayout>
    </>
  );
};

export default DocumentManagementSearch;
