"use client";

import { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { generateCsvFromFields, type OcrField } from "../utils/ocr";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";

type FieldSource =
  | Array<{ label?: unknown; value?: unknown }>
  | Record<string, unknown>
  | string
  | null
  | undefined;

const coerceLabel = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value != null) {
    return String(value).trim();
  }
  return "";
};

const coerceValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value != null) {
    return String(value);
  }
  return "";
};

const normalizeFieldSource = (source: FieldSource): OcrField[] => {
  if (!source) {
    return [];
  }

  if (typeof source === "string") {
    try {
      const parsed = JSON.parse(source) as FieldSource;
      return normalizeFieldSource(parsed);
    } catch {
      return [];
    }
  }

  if (Array.isArray(source)) {
    return source
      .map((item) => {
        if (!item) {
          return null;
        }
        const label = coerceLabel(item.label);
        if (!label) {
          return null;
        }
        return { label, value: coerceValue(item.value) };
      })
      .filter((item): item is OcrField => item !== null);
  }

  return Object.entries(source)
    .map(([label, value]) => {
      const normalizedLabel = coerceLabel(label);
      if (!normalizedLabel) {
        return null;
      }
      return {
        label: normalizedLabel,
        value: coerceValue(value),
      };
    })
    .filter((item): item is OcrField => item !== null);
};

const normalizePayload = (
  value: unknown
): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    const candidate = value.find(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && !Array.isArray(item)
    );
    return candidate ?? null;
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizePayload(parsed);
    } catch {
      return null;
    }
  }
  return null;
};

const extractFieldsForExport = (
  payload: Record<string, unknown>
): OcrField[] => {
  const embedded =
    "payload" in payload ? normalizePayload(payload.payload) : null;
  const payloadObject =
    typeof payload.payload === "object" && payload.payload !== null
      ? (payload.payload as Record<string, unknown>)
      : undefined;
  const workingPayload = embedded ?? payloadObject ?? payload;

  const sources: FieldSource[] = [
    workingPayload.result as FieldSource,
    workingPayload.fields as FieldSource,
    workingPayload.display_fields as FieldSource,
    workingPayload.data as FieldSource,
    workingPayload.raw as FieldSource,
  ];

  for (const source of sources) {
    const normalized = normalizeFieldSource(source);
    if (normalized.length > 0) {
      return normalized;
    }
  }

  const fallback: Record<string, unknown> = {};
  Object.entries(workingPayload).forEach(([key, value]) => {
    if (
      [
        "documentClass",
        "document_class",
        "document_type",
        "type",
        "raw",
        "docId",
        "doc_id",
      ].includes(
        key
      )
    ) {
      return;
    }
    fallback[key] = value;
  });

  return normalizeFieldSource(fallback);
};

const DataExportOptions = () => {
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();
  const [csvContent, setCsvContent] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedCsv =
        window.sessionStorage.getItem("ocrCsvContent") ||
        window.localStorage.getItem("ocrCsvContent");
      if (storedCsv) {
        setCsvContent(storedCsv);
        return;
      }

      const raw =
        window.localStorage.getItem("ocrResultData") ||
        window.sessionStorage.getItem("ocrResultData");
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        const normalizedPayload = normalizePayload(parsed);
        if (!normalizedPayload) {
          return;
        }
        const normalized = extractFieldsForExport(normalizedPayload);
        if (normalized.length > 0) {
          const generated = generateCsvFromFields(normalized);
          setCsvContent(generated);
        }
      }
    } catch (error) {
      console.warn("Failed to load CSV content", error);
    }
  }, []);

  const handleDownloadCsv = () => {
    if (!csvContent) {
      setMessage(t("export.messages.noContent"));
      return;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scanledger-export-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage(t("export.messages.downloadStarted"));
    setTimeout(() => setMessage(null), 2500);
  };

  const handleCopyCsv = () => {
    if (!csvContent) {
      setMessage(t("export.messages.noContentToCopy"));
      return;
    }
    if (!navigator.clipboard) {
      setMessage(t("export.messages.clipboardUnavailable"));
      return;
    }
    navigator.clipboard
      .writeText(csvContent)
      .then(() => {
        setMessage(t("export.messages.copied"));
        setTimeout(() => setMessage(null), 2500);
      })
      .catch(() => setMessage(t("export.messages.copyFailed")));
  };

  const handleClearExports = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem("exportedDocuments");
    window.localStorage.removeItem("ocrResultData");
    window.localStorage.removeItem("ocrCsvContent");
    window.sessionStorage.removeItem("ocrResultData");
    window.sessionStorage.removeItem("ocrCsvContent");
    setCsvContent("");
    setMessage(t("export.messages.historyCleared"));
    setTimeout(() => setMessage(null), 2500);
  };

  const header = (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        {t("export.header.title")}
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        {t("export.header.subtitle")}
      </p>
    </div>
  );

  return (
    <AppLayout
      header={header}
      className="bg-[#111827] text-white"
      contentClassName="space-y-6"
    >
      <Card className="bg-[#1F2937]">
        <CardHeader>
          <CardTitle>{t("export.sections.csv.title")}</CardTitle>
          <p className="text-sm text-gray-400">
            {t("export.sections.csv.description")}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" size="lg" onClick={handleDownloadCsv}>
            {t("export.actions.downloadCsv")}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            size="lg"
            onClick={handleCopyCsv}
          >
            {t("export.actions.copyCsv")}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#1F2937]">
        <CardHeader>
          <CardTitle>{t("export.sections.integrations.title")}</CardTitle>
          <p className="text-sm text-gray-400">
            {t("export.sections.integrations.description")}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            {t("export.sections.integrations.note")}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-[#1F2937]">
        <CardHeader>
          <CardTitle>{t("export.sections.history.title")}</CardTitle>
          <p className="text-sm text-gray-400">
            {t("export.sections.history.description")}
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full border-red-400/60 text-red-200 hover:bg-red-500/10"
            size="lg"
            onClick={handleClearExports}
          >
            {t("export.actions.clearHistory")}
          </Button>
        </CardContent>
      </Card>

      {message && (
        <Card className="border-emerald-400/60 bg-emerald-400/10">
          <CardContent className="px-4 py-2 text-center text-sm text-emerald-200">
            {message}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default DataExportOptions;
