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
        const parsed = JSON.parse(raw) as {
          display_fields?: OcrField[] | unknown;
        };
        if (Array.isArray(parsed?.display_fields)) {
          const generated = generateCsvFromFields(parsed.display_fields);
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
