"use client";

import type { CSSProperties, FC, KeyboardEvent } from "react";
import { useMemo } from "react";
import { Card, CardContent } from "../ui/card";
import { useTranslation } from "@/src/lib/i18n";
import type { DocumentSummary } from "@/src/features/documents/hooks/usePaginatedDocuments";

interface DocumentRowProps {
  document: DocumentSummary;
  onSelect: () => void;
}

export const DocumentRow: FC<DocumentRowProps> = ({ document, onSelect }) => {
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

export default DocumentRow;
