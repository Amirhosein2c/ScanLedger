"use client";

import type { ChangeEvent, CSSProperties, FC, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../components/layout/AppLayout";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";
import { AppIcon } from "@/src/components/AppIcon";
import {
  type DocumentSummary,
  usePaginatedDocuments,
} from "../features/documents/hooks/usePaginatedDocuments";

// const documentsMode =
//   process.env.NEXT_PUBLIC_DOCUMENTS_MODE === "server" ? "server" : "mock";

const documentsMode = "mock";
interface DocumentRowProps {
  document: DocumentSummary;
  onSelect: () => void;
}

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

const DocumentRow: FC<DocumentRowProps> = ({ document, onSelect }) => {
  const { t } = useTranslation();
  const thumbnailStyle: CSSProperties = useMemo(() => {
    const thumbnail = document.scan_thumbnail;
    if (typeof thumbnail !== "string" || !thumbnail.trim()) {
      return { backgroundColor: "#1F2937" };
    }
    const dataUri = thumbnail.startsWith("data:")
      ? thumbnail
      : `data:image/png;base64,${thumbnail}`;
    return { backgroundImage: `url('${dataUri}')` };
  }, [document.scan_thumbnail]);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="bg-[#1F2937] cursor-pointer transition hover:bg-[#273248] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
    >
      <CardContent className="flex items-center gap-4 p-3">
        <div
          className="size-14 rounded-lg bg-cover bg-center bg-no-repeat"
          style={thumbnailStyle}
        />
        <div className="flex-1">
          <p className="line-clamp-1 text-base font-medium text-white">
            {document.Document_id || t("documents.common.document")}
          </p>
          <p className="line-clamp-2 text-sm text-[#D1D5DB]">
            {document.OCR_DateTime
              ? new Date(document.OCR_DateTime).toLocaleString()
              : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#D1D5DB]">
            {typeof document.Status === "string" ? document.Status : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const DocumentManagementSearch = () => {
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>(
    () => searchParams?.get("documents") ?? ""
  );
  const { documents, loadMore, isLoading, hasMore, error } =
    usePaginatedDocuments({ pageSize: 5, mode: documentsMode });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nextQuery = searchParams?.get("documents") ?? "";
    setQuery((current) => (current === nextQuery ? current : nextQuery));
  }, [searchParams]);

  useEffect(() => {
    if (documents.length === 0 && hasMore && !isLoading) {
      void loadMore();
    }
  }, [documents.length, hasMore, isLoading, loadMore]);

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
  }, [hasMore, loadMore, documents.length]);

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);

    const params = new URLSearchParams(
      searchParams ? searchParams.toString() : ""
    );
    if (nextQuery) {
      params.set("documents", nextQuery);
    } else {
      params.delete("documents");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
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
      <div className="relative">
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
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {(["date", "category", "vendor"] as const).map((filter) => (
          <Button
            key={filter}
            type="button"
            variant="secondary"
            size="sm"
            className="h-10 shrink-0 gap-x-2 rounded-full bg-[#1F2937] text-sm text-white hover:bg-white/10"
          >
            <span>{t(`documents.filters.${filter}`)}</span>
            <AppIcon name="keyboard_arrow_down" className="h-5 w-5" />
          </Button>
        ))}
      </div>
    </div>
  );

  return (
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
        >
          <span>{t("documents.actions.sort")}</span>
          <AppIcon name="swap_vert" className="h-5 w-5" />
        </Button>
      </div>
      <div className="space-y-2 pb-6">
        {!hasMore && !isLoading && documents.length === 0 && (
          <p className="text-sm text-gray-400">{t("documents.search.empty")}</p>
        )}
        {documents.map((document, index) => {
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
          Array.from({ length: documents.length === 0 ? 3 : 1 }).map(
            (_, index) => <DocumentSkeleton key={`skeleton-${index}`} />
          )}
        <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
      </div>
    </AppLayout>
  );
};

export default DocumentManagementSearch;
