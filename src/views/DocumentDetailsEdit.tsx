"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import {
  extractOcrFields,
  generateCsvFromFields,
  inferSummaryFromFields,
  type OcrField,
} from "../utils/ocr";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";

type InputType = "text" | "date" | "currency" | "email" | "tel";

interface DefaultFormState {
  date: string;
  amount: string;
  vendor: string;
  category: string;
}

const normalizeFields = (fields: unknown): OcrField[] => {
  if (!Array.isArray(fields)) {
    return [];
  }
  const seen = new Set<string>();
  return fields
    .map((field) => {
      if (typeof field !== "object" || field === null) {
        return { label: "", value: "" };
      }
      const record = field as Record<string, unknown>;
      return {
        label: (record.label ?? record.name ?? record.key ?? "").toString(),
        value: record.value != null ? String(record.value) : "",
      };
    })
    .filter((field) => {
      const key = `${field.label}|${field.value}`;
      if (!field.label) {
        return false;
      }
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const detectInputType = (label: string, value: string): InputType => {
  const lower = label.toLowerCase();
  if (lower.includes("date") || lower.includes("due")) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? "text" : "date";
  }
  if (
    lower.includes("amount") ||
    lower.includes("total") ||
    lower.includes("price") ||
    lower.includes("subtotal") ||
    lower.includes("tax") ||
    value.includes("$")
  ) {
    return "currency";
  }
  if (lower.includes("email")) {
    return "email";
  }
  if (lower.includes("phone") || lower.includes("tel")) {
    return "tel";
  }
  return "text";
};

const formatDateForInput = (value: string): string => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "";
  }
  return new Date(parsed).toISOString().slice(0, 10);
};

const DocumentDetailsEdit = () => {
  const router = useRouter();
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [imageSrc, setImageSrc] = useState<string>("");
  const [fields, setFields] = useState<OcrField[]>([]);
  const [defaultForm, setDefaultForm] = useState<DefaultFormState>({
    date: "",
    amount: "",
    vendor: "",
    category: "Food & Drink",
  });
  const [message, setMessage] = useState<string | null>(null);

  const translateDocumentType = (value: string | undefined): string => {
    if (!value) {
      return t("documents.summary.fallback");
    }
    const key = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return t(`documents.summary.types.${key}`, { defaultValue: value });
  };

  const displayFieldLabel = (label: string): string => {
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return t(`documentDetails.fields.${key}`, { defaultValue: label });
  };

  const categoryOptions = useMemo(
    () => [
      { value: "Groceries", label: t("documents.categories.groceries") },
      { value: "Transport", label: t("documents.categories.transport") },
      {
        value: "Entertainment",
        label: t("documents.categories.entertainment"),
      },
      { value: "Food & Drink", label: t("documents.categories.foodDrink") },
    ],
    [t]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const loadImage = () => {
      try {
        const cached =
          window.sessionStorage.getItem("scannedImageDataUrl") ||
          window.localStorage.getItem("scannedImageDataUrl");
        if (cached) {
          setImageSrc(cached);
        }
      } catch (error) {
        console.warn("Failed to read scanned image", error);
      }
    };

    const loadOcrData = async () => {
      if (!searchParams) {
        return;
      }
      try {
        const ocrUrl = searchParams.get("ocr_url");
        const ocrInline = searchParams.get("ocr");
        let raw: string | null = null;

        if (ocrUrl) {
          try {
            const res = await fetch(ocrUrl, { credentials: "omit" });
            if (res.ok) {
              raw = await res.text();
            }
          } catch (error) {
            console.warn("Failed to load OCR data from URL", error);
          }
        } else if (ocrInline) {
          try {
            raw = decodeURIComponent(ocrInline);
            if (raw.startsWith("data:")) {
              const base64 = (raw.split(",")[1] || "").trim();
              raw = atob(base64);
            }
          } catch (error) {
            console.warn("Failed to parse inline OCR payload", error);
          }
        }

        if (!raw) {
          raw =
            window.sessionStorage.getItem("ocrResultData") ||
            window.localStorage.getItem("ocrResultData");
        }

        if (!raw) {
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          console.warn(
            "OCR data is not valid JSON, storing as raw text",
            error
          );
          parsed = { rawText: raw };
        }

        const extractedFields = normalizeFields(extractOcrFields(parsed));
        if (extractedFields.length > 0) {
          setFields(extractedFields);
          const summary = inferSummaryFromFields(extractedFields, imageSrc);
          setDefaultForm((prev) => ({
            ...prev,
            date: summary.date ? formatDateForInput(summary.date) : prev.date,
            amount: summary.amount || prev.amount,
            vendor: summary.vendor || prev.vendor,
          }));
        }
      } catch (error) {
        console.warn("Unable to load OCR data", error);
      }
    };

    loadImage();
    loadOcrData();
  }, [imageSrc, searchParams]);

  const handleFieldChange = (index: number, value: string) => {
    setFields((prev) =>
      prev.map((field, idx) => (idx === index ? { ...field, value } : field))
    );
  };

  const handleDefaultChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setDefaultForm((prev) => ({ ...prev, [name]: value }));
  };

  const effectiveFields = useMemo<OcrField[]>(() => {
    if (fields.length > 0) {
      return fields;
    }
    return [
      { label: "Date", value: defaultForm.date },
      { label: "Amount", value: defaultForm.amount },
      { label: "Vendor", value: defaultForm.vendor },
      { label: "Category", value: defaultForm.category },
    ];
  }, [fields, defaultForm]);

  const handleDiscard = () => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.sessionStorage.removeItem("scannedImageDataUrl");
      window.sessionStorage.removeItem("ocrResultData");
      window.localStorage.removeItem("scannedImageDataUrl");
      window.localStorage.removeItem("ocrResultData");
    } catch (error) {
      console.warn("Failed to clear cached scan", error);
    }
    router.push("/documents/scan");
  };

  const handleSave = () => {
    if (
      fields.length === 0 &&
      !defaultForm.date &&
      !defaultForm.amount &&
      !defaultForm.vendor
    ) {
      setMessage(t("documentDetails.messages.noFields"));
      return;
    }

    try {
      const csvContent = generateCsvFromFields(effectiveFields);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ocrCsvContent", csvContent);
        window.sessionStorage.setItem("ocrCsvContent", csvContent);

        const serialized = JSON.stringify(effectiveFields);
        window.localStorage.setItem("ocrResultData", serialized);
        window.sessionStorage.setItem("ocrResultData", serialized);

        const previouslyExportedRaw =
          window.localStorage.getItem("exportedDocuments");
        const previouslyExported = previouslyExportedRaw
          ? JSON.parse(previouslyExportedRaw)
          : [];
        const summary = inferSummaryFromFields(effectiveFields, imageSrc);
        const updated = Array.isArray(previouslyExported)
          ? [...previouslyExported, summary]
          : [summary];

        window.localStorage.setItem(
          "exportedDocuments",
          JSON.stringify(updated)
        );
      }
      setMessage(t("documentDetails.messages.saved"));
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error("Failed to persist document", error);
      setMessage(t("documentDetails.messages.saveFailed"));
    }
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
          <img
            src={imageSrc}
            alt={t("documentDetails.previewAlt")}
            className="h-64 w-full object-contain"
          />
        </div>
      )}

      <section className="space-y-4 rounded-2xl bg-[#1F2937] p-6 shadow-lg">
        <h3 className="text-lg font-semibold">
          {t("documentDetails.summary.title")}
        </h3>
        <div className="grid gap-3 text-sm text-gray-300">
          {(() => {
            const summary = inferSummaryFromFields(effectiveFields, imageSrc);
            return (
              <>
                <div className="flex justify-between">
                  <span>{t("documentDetails.summary.labels.type")}</span>
                  <span className="font-medium text-white">
                    {translateDocumentType(summary.type)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("documentDetails.summary.labels.amount")}</span>
                  <span className="font-medium text-white">
                    {summary.amount || t("documentDetails.summary.emptyValue")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("documentDetails.summary.labels.vendor")}</span>
                  <span className="font-medium text-white">
                    {summary.vendor || t("documentDetails.summary.emptyValue")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("documentDetails.summary.labels.date")}</span>
                  <span className="font-medium text-white">
                    {summary.date || t("documentDetails.summary.emptyValue")}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-[#1F2937] p-6 shadow-lg">
        <h3 className="text-lg font-semibold">
          {t("documentDetails.sections.extractedFields")}
        </h3>
        {fields.length > 0 ? (
          <div className="space-y-4">
            {fields.map((field, index) => {
              const inputType = detectInputType(field.label, field.value);

              if (inputType === "date") {
                return (
                  <label key={`${field.label}-${index}`} className="block">
                    <span className="text-sm font-medium text-[#C7D2FE]">
                      {displayFieldLabel(field.label)}
                    </span>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                      value={formatDateForInput(field.value)}
                      onChange={(event) =>
                        handleFieldChange(index, event.target.value)
                      }
                    />
                  </label>
                );
              }

              if (inputType === "currency") {
                return (
                  <label key={`${field.label}-${index}`} className="block">
                    <span className="text-sm font-medium text-[#C7D2FE]">
                      {displayFieldLabel(field.label)}
                    </span>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#96c5a9]">
                        $
                      </span>
                      <input
                        className="block w-full rounded-xl border-transparent bg-[#1F2937] pl-8 pr-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                        value={field.value.replace(/[^0-9.-]/g, "")}
                        onChange={(event) =>
                          handleFieldChange(index, event.target.value)
                        }
                      />
                    </div>
                  </label>
                );
              }

              return (
                <label key={`${field.label}-${index}`} className="block">
                  <span className="text-sm font-medium text-[#C7D2FE]">
                    {displayFieldLabel(field.label)}
                  </span>
                  <input
                    type={inputType}
                    className="mt-1 block w-full rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                    value={field.value}
                    onChange={(event) =>
                      handleFieldChange(index, event.target.value)
                    }
                  />
                </label>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-[#C7D2FE]">
                {displayFieldLabel("Date")}
              </span>
              <input
                type="date"
                name="date"
                className="mt-1 block w-full rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                value={defaultForm.date}
                onChange={handleDefaultChange}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#C7D2FE]">
                {displayFieldLabel("Amount")}
              </span>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#96c5a9]">
                  $
                </span>
                <input
                  type="text"
                  name="amount"
                  className="block w-full rounded-xl border-transparent bg-[#1F2937] pl-8 pr-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                  value={defaultForm.amount}
                  onChange={handleDefaultChange}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#C7D2FE]">
                {displayFieldLabel("Vendor")}
              </span>
              <input
                type="text"
                name="vendor"
                className="mt-1 block w-full rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                placeholder={t("documentDetails.placeholders.vendorExample")}
                value={defaultForm.vendor}
                onChange={handleDefaultChange}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#C7D2FE]">
                {displayFieldLabel("Category")}
              </span>
              <select
                name="category"
                className="mt-1 block w-full appearance-none rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                value={defaultForm.category}
                onChange={handleDefaultChange}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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
