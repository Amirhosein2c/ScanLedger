"use client";

import type { ChangeEvent, CSSProperties, FC, KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../components/layout/AppLayout";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";
import { AppIcon } from "@/src/components/AppIcon";
import { getStoredUserData } from "../features/auth/profile";

interface BackendDocument {
  Document_id: string;
  OCR_DateTime?: string | null;
  Status?: string | null;
  scan_thumbnail?: string | null;
  [key: string]: unknown;
}

interface DocumentRowProps {
  document: BackendDocument;
  onSelect: () => void;
}

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
  const [query, setQuery] = useState<string>("");
  const [documents, setDocuments] = useState<BackendDocument[]>([]);

  useEffect(() => {
    const profile = getStoredUserData();
    const storedDocs = Array.isArray(profile?.documents)
      ? (profile?.documents as BackendDocument[])
      : [];
    const normalized = storedDocs.filter((doc) =>
      typeof doc.Document_id === "string"
    );
    setDocuments(normalized);
  }, []);

  const filteredDocuments = useMemo(() => {
    if (!query.trim()) {
      return documents;
    }
    const normalized = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const haystack = [
        doc.Document_id,
        doc.OCR_DateTime,
        typeof doc.Status === "string" ? doc.Status : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [documents, query]);

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
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
        {filteredDocuments.length === 0 && (
          <p className="text-sm text-gray-400">{t("documents.search.empty")}</p>
        )}
        {filteredDocuments.map((document) => (
          <DocumentRow
            key={document.Document_id}
            document={document}
            onSelect={() => {
              router.push(
                `/documents/details?id=${encodeURIComponent(document.Document_id)}`
              );
            }}
          />
        ))}
      </div>
    </AppLayout>
  );
};

export default DocumentManagementSearch;
