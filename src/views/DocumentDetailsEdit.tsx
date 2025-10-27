"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import AppLayout from "../components/layout/AppLayout";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";
import { generateCsvFromFields, type OcrField } from "../utils/ocr";
import {
  clearPersistedImageData,
  clearPersistedOcrResult,
  getPersistedImageDataUrl,
  getPersistedOcrResult,
  persistOcrResult,
} from "./document-scan/storage";

type StoredDocumentPayload = {
  documentClass: string;
  result: Record<string, string>;
};

const emptyPayload: StoredDocumentPayload = {
  documentClass: "",
  result: {},
};

const toRecord = (source: unknown): Record<string, string> => {
  if (!source) {
    return {};
  }

  if (typeof source === "string") {
    try {
      const parsed = JSON.parse(source);
      return toRecord(parsed);
    } catch {
      return {};
    }
  }

  if (Array.isArray(source)) {
    return source.reduce<Record<string, string>>((acc, item) => {
      if (!item || typeof item !== "object") {
        return acc;
      }
      const entry = item as Record<string, unknown>;
      const labelSource =
        entry.label ?? entry.name ?? entry.key ?? entry.field ?? null;
      const label =
        typeof labelSource === "string"
          ? labelSource.trim()
          : labelSource != null
          ? String(labelSource).trim()
          : "";
      if (!label) {
        return acc;
      }
      const valueSource =
        entry.value ?? entry.text ?? entry.raw ?? entry.content ?? "";
      acc[label] =
        typeof valueSource === "string"
          ? valueSource
          : valueSource != null
          ? String(valueSource)
          : "";
      return acc;
    }, {});
  }

  if (typeof source === "object") {
    return Object.entries(source as Record<string, unknown>).reduce<
      Record<string, string>
    >((acc, [label, value]) => {
      const normalizedLabel =
        typeof label === "string" ? label.trim() : String(label);
      if (!normalizedLabel) {
        return acc;
      }
      acc[normalizedLabel] = value != null ? String(value) : "";
      return acc;
    }, {});
  }

  return {};
};

const parseStoredPayload = (raw: string | null): StoredDocumentPayload => {
  if (!raw) {
    return emptyPayload;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    const normalize = (input: unknown): Record<string, unknown> | null => {
      if (!input) {
        return null;
      }
      if (Array.isArray(input)) {
        const candidate = input.find(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object" && !Array.isArray(item)
        );
        return candidate ?? null;
      }
      if (typeof input === "object") {
        return input as Record<string, unknown>;
      }
      if (typeof input === "string") {
        try {
          const parsedString = JSON.parse(input);
          return normalize(parsedString);
        } catch {
          return null;
        }
      }
      return null;
    };

    const record = normalize(parsed);
    if (!record) {
      return emptyPayload;
    }

    const documentClassSource =
      record.documentClass ??
      record.document_class ??
      record.type ??
      record.document_type ??
      "";
    const documentClass =
      typeof documentClassSource === "string"
        ? documentClassSource.trim()
        : documentClassSource != null
        ? String(documentClassSource).trim()
        : "";

    const resultSource =
      record.result ??
      record.fields ??
      record.display_fields ??
      record.data ??
      record.raw ??
      {};

    return {
      documentClass,
      result: toRecord(resultSource),
    };
  } catch (error) {
    console.warn("Unable to parse stored OCR payload", error);
    return emptyPayload;
  }
};

type FieldRow = {
  label: string;
  value: string;
};

const toFieldRows = (record: Record<string, string>): FieldRow[] =>
  Object.entries(record).map(([label, value]) => ({
    label,
    value,
  }));

const reduceFieldsToRecord = (rows: FieldRow[]): Record<string, string> =>
  rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.label] = row.value ?? "";
    return acc;
  }, {});

const findValueByKeywords = (rows: FieldRow[], keywords: string[]): string => {
  const lowered = keywords.map((keyword) => keyword.toLowerCase());
  const hit = rows.find((row) =>
    lowered.some((keyword) => row.label.toLowerCase().includes(keyword))
  );
  return hit?.value?.trim() || "";
};

const DocumentDetailsEdit = () => {
  const router = useRouter();
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();

  const [imageSrc, setImageSrc] = useState<string>("");
  const [documentClass, setDocumentClass] = useState<string>("");
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setImageSrc(getPersistedImageDataUrl() || "");

    const payload = parseStoredPayload(getPersistedOcrResult());
    setDocumentClass(payload.documentClass);

    const rows = toFieldRows(payload.result);
    setFields(rows.length > 0 ? rows : []);
  }, []);

  const summary = useMemo(() => {
    const type = documentClass || t("documents.summary.fallback");
    console.log("fields", fields);

    const amount =
      findValueByKeywords(fields, ["total", "amount"]) ||
      t("documentDetails.summary.emptyValue");
    const vendor =
      findValueByKeywords(fields, ["vendor", "customer", "name"]) ||
      t("documentDetails.summary.emptyValue");
    const date =
      findValueByKeywords(fields, ["date"]) ||
      t("documentDetails.summary.emptyValue");

    return { type, amount, vendor, date };
  }, [documentClass, fields, t]);

  const handleFieldChange = (index: number, value: string) => {
    setFields((current) => {
      const next = [...current];
      next[index] = { ...next[index], value };
      return next;
    });
  };

  const handleSave = () => {
    if (fields.length === 0) {
      setMessage(t("documentDetails.messages.noFields"));
      return;
    }

    const cleanedFields = fields.map((field) => ({
      label: field.label,
      value: field.value.trim(),
    }));

    const payload: StoredDocumentPayload = {
      documentClass: documentClass.trim(),
      result: reduceFieldsToRecord(cleanedFields),
    };

    persistOcrResult(JSON.stringify(payload));

    const csvContent = generateCsvFromFields(
      cleanedFields.map<OcrField>((field) => ({
        label: field.label,
        value: field.value,
      }))
    );

    if (typeof window !== "undefined") {
      window.localStorage.setItem("ocrCsvContent", csvContent);
      window.sessionStorage.setItem("ocrCsvContent", csvContent);

      const existingRaw =
        window.localStorage.getItem("exportedDocuments") || "[]";

      let previous: unknown = [];
      try {
        previous = JSON.parse(existingRaw);
      } catch (error) {
        console.warn("Unable to read exported documents history", error);
      }

      const history = Array.isArray(previous) ? previous : [];
      const updated = [
        ...history,
        {
          type: payload.documentClass || t("documents.summary.fallback"),
          amount: summary.amount,
          vendor: summary.vendor,
          date: summary.date,
          image: imageSrc,
          ts: new Date().toISOString(),
        },
      ];

      window.localStorage.setItem("exportedDocuments", JSON.stringify(updated));
    }

    setMessage(t("documentDetails.messages.saved"));
    setTimeout(() => setMessage(null), 2000);
  };

  const handleDiscard = () => {
    clearPersistedImageData();
    clearPersistedOcrResult();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ocrCsvContent");
      window.sessionStorage.removeItem("ocrCsvContent");
    }
    router.push("/documents/scan");
  };

  const header = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        onClick={() => router.push("/documents/scan")}
      >
        <span className="material-symbols-outlined text-3xl">arrow_back</span>
      </button>
      <h2 className="text-lg font-bold">{t("documentDetails.header.title")}</h2>
      <div className="flex h-12 w-12 items-center justify-center rounded-full text-[#96c5a9]">
        <span className="material-symbols-outlined text-3xl">edit</span>
      </div>
    </div>
  );

  return (
    <AppLayout
      header={header}
      className="bg-[#111827] text-white"
      contentClassName="flex flex-col gap-6"
    >
      {imageSrc && (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <Image
            src={imageSrc}
            alt={t("documentDetails.previewAlt")}
            width={512}
            height={256}
            className="h-64 w-full object-contain"
            unoptimized
          />
        </div>
      )}

      <section className="space-y-4 rounded-2xl bg-[#1F2937] p-6 shadow-lg">
        <h3 className="text-lg font-semibold">
          {t("documentDetails.summary.title")}
        </h3>
        <label className="block text-sm text-gray-300">
          <span className="mb-1 block font-medium text-[#C7D2FE]">
            {t("documentDetails.summary.labels.type")}
          </span>
          <input
            type="text"
            className="block w-full rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
            value={documentClass}
            placeholder={t("documents.summary.fallback")}
            onChange={(event) => setDocumentClass(event.target.value)}
          />
        </label>
        <div className="grid gap-3 text-sm text-gray-300">
          <div className="flex justify-between">
            <span>{t("documentDetails.summary.labels.amount")}</span>
            <span className="font-medium text-white">{summary.amount}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("documentDetails.summary.labels.vendor")}</span>
            <span className="font-medium text-white">{summary.vendor}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("documentDetails.summary.labels.date")}</span>
            <span className="font-medium text-white">{summary.date}</span>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-[#1F2937] p-6 shadow-lg">
        <h3 className="text-lg font-semibold">
          {t("documentDetails.sections.extractedFields")}
        </h3>
        {fields.length === 0 ? (
          <p className="text-sm text-gray-400">
            {t("documentDetails.messages.noFields")}
          </p>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <label key={`${field.label}-${index}`} className="block">
                <span className="text-sm font-medium text-[#C7D2FE]">
                  {field.label}
                </span>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                  value={field.value}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleFieldChange(index, event.target.value)
                  }
                />
              </label>
            ))}
          </div>
        )}

        {message && (
          <div className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-center text-sm text-yellow-200">
            {message}
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            className="flex-1 rounded-full bg-[#1F2937] py-3 text-center text-base font-bold text-white"
            onClick={handleDiscard}
          >
            {t("documentDetails.actions.discard")}
          </button>
          <button
            type="button"
            className="flex-1 rounded-full bg-[var(--primary-color)] py-3 text-center text-base font-bold text-[#111827]"
            onClick={handleSave}
          >
            {t("documentDetails.actions.save")}
          </button>
        </div>
      </section>
    </AppLayout>
  );
};

export default DocumentDetailsEdit;
