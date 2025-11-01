"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

import AppLayout from "../components/layout/AppLayout";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";
import { AppIcon } from "@/src/components/AppIcon";
import { generateCsvFromFields, type OcrField } from "../utils/ocr";
import {
  clearPersistedImageData,
  clearPersistedOcrResult,
  getPersistedImageDataUrl,
  getPersistedOcrResult,
  persistOcrResult,
} from "./document-scan/storage";
import { useConfirmOcr } from "./document-scan/hooks/useConfirmOcr";
import {
  extractDocumentPayload,
  type DocumentPayload,
} from "@/src/utils/documentPayload";
import { apiGet } from "@/src/utils/api";

type FieldRow = {
  label: string;
  value: string;
};

type SavedDocumentRecord = {
  document_ID?: string;
  docId?: string;
  id?: string;
  type?: string;
  amount?: string;
  vendor?: string;
  date?: string;
  image?: string;
  ts?: string;
  payload?: unknown;
  [key: string]: unknown;
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

const readSavedDocuments = (): SavedDocumentRecord[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem("exportedDocuments");
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedDocumentRecord[]) : [];
  } catch (error) {
    console.warn("Failed to read saved documents", error);
    return [];
  }
};

const getDocumentIdFromRecord = (record: SavedDocumentRecord): string => {
  const directCandidates = [
    record.document_ID,
    record.docId,
    record.id,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (record.payload) {
    const payload = extractDocumentPayload(record.payload);
    if (payload?.docId) {
      return payload.docId;
    }
  }

  return "";
};

const findSavedDocument = (
  documents: SavedDocumentRecord[],
  identifier: string
): { record: SavedDocumentRecord; index: number } | null => {
  const normalized = identifier?.trim();
  if (!normalized) {
    return null;
  }

  const index = documents.findIndex((doc) => {
    const docId = getDocumentIdFromRecord(doc);
    return docId === normalized;
  });

  if (index === -1) {
    return null;
  }

  return { record: documents[index], index };
};

const buildCsvFromFields = (rows: FieldRow[]): string =>
  generateCsvFromFields(
    rows.map<OcrField>((field) => ({
      label: field.label,
      value: field.value,
    }))
  );

const resolveImageSrc = (provided?: string | null): string => {
  const candidate = (provided ?? "").trim();
  if (candidate) {
    return candidate;
  }
  const fallback = getPersistedImageDataUrl();
  return fallback ? fallback : "";
};

const DocumentDetailsEdit = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();

  const savedDocumentId = searchParams.get("id");

  const [docId, setDocId] = useState<string>("");
  const [documentClass, setDocumentClass] = useState<string>("");
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [isExistingDocument, setIsExistingDocument] = useState<boolean>(
    Boolean(savedDocumentId)
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { saveOcr, discardOcr, isConfirming } = useConfirmOcr({
    t,
    onError: (errorMessage) => {
      if (errorMessage) {
        setMessage(errorMessage);
        return;
      }
      setMessage(null);
    },
  });

  const navigateBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/documents/search");
    }
  };

  const applyPayload = useCallback(
    (
      payload: DocumentPayload,
      options: {
        image?: string | null;
        index?: number | null;
        existing?: boolean;
      } = {}
    ) => {
      setDocId(payload.docId);
      setDocumentClass(payload.documentClass || "");
      setFields(toFieldRows(payload.result));
      const resolvedImage = resolveImageSrc(
        typeof options.image === "string" ? options.image : payload.imageUrl
      );
      setImageSrc(resolvedImage);
      setEditingIndex(
        typeof options.index === "number" ? options.index : null
      );
      setIsExistingDocument(options.existing ?? Boolean(savedDocumentId));
      setMessage(null);
      setHasInitialized(true);
    },
    [savedDocumentId]
  );

  useEffect(() => {
    const initialize = async () => {
      if (savedDocumentId) {
        setIsLoading(true);
        try {
          const response = await apiGet<unknown>(
            `/multi-agent-ocr/documents/${encodeURIComponent(savedDocumentId)}`
          );
          const backendPayload = extractDocumentPayload(response);
          if (backendPayload) {
            applyPayload(backendPayload, {
              image: backendPayload.imageUrl ?? "",
              existing: true,
              index: null,
            });
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.warn("Failed to fetch document details", error);
        }

        const savedDocuments = readSavedDocuments();
        const match = findSavedDocument(savedDocuments, savedDocumentId);
        if (match) {
          const payload = extractDocumentPayload(
            match.record.payload ?? match.record
          );
          if (payload) {
            applyPayload(payload, {
              image: match.record.image ?? payload.imageUrl ?? "",
              index: match.index,
              existing: true,
            });
            setIsLoading(false);
            return;
          }
        }

        setMessage(t("documentDetails.messages.missingDocument"));
        setIsExistingDocument(true);
        setEditingIndex(null);
        setDocId("");
        setFields([]);
        setIsLoading(false);
        setHasInitialized(true);
        return;
      }

      const draftPayload = extractDocumentPayload(getPersistedOcrResult());
      if (draftPayload) {
        applyPayload(draftPayload, {
          image: draftPayload.imageUrl ?? "",
          existing: false,
        });
        setIsLoading(false);
        return;
      }

      setMessage(t("documentDetails.messages.noFields"));
      setIsExistingDocument(false);
      setEditingIndex(null);
      setDocId("");
      setFields([]);
      setIsLoading(false);
      setHasInitialized(true);
    };

    void initialize();
  }, [applyPayload, savedDocumentId, t]);

  useEffect(() => {
    if (!hasInitialized) {
      return;
    }
    const trimmedId = docId.trim();
    if (!trimmedId) {
      return;
    }

    const payload = {
      docId: trimmedId,
      documentClass: documentClass.trim(),
      result: reduceFieldsToRecord(fields),
    };

    persistOcrResult(JSON.stringify(payload));
  }, [docId, documentClass, fields, hasInitialized]);

  const summary = useMemo(() => {
    const type = documentClass || t("documents.summary.fallback");
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
    setMessage(null);
  };

  const handleSave = async () => {
    setMessage(null);

    if (fields.length === 0) {
      setMessage(t("documentDetails.messages.noFields"));
      return;
    }

    const trimmedDocId = docId.trim();
    if (!trimmedDocId) {
      setMessage(t("documentDetails.messages.missingDocumentId"));
      return;
    }

    const cleanedFields = fields.map((field) => ({
      label: field.label,
      value: field.value.trim(),
    }));

    const payloadToPersist = {
      docId: trimmedDocId,
      documentClass: documentClass.trim(),
      result: reduceFieldsToRecord(cleanedFields),
    };

    persistOcrResult(JSON.stringify(payloadToPersist));

    if (typeof window !== "undefined") {
      const csvContent = buildCsvFromFields(cleanedFields);

      try {
        window.localStorage.setItem("ocrCsvContent", csvContent);
      } catch {
        window.localStorage.removeItem("ocrCsvContent");
      }

      try {
        window.sessionStorage.setItem("ocrCsvContent", csvContent);
      } catch {
        window.sessionStorage.removeItem("ocrCsvContent");
      }

      const records = readSavedDocuments();
      const existingIndex =
        editingIndex != null && editingIndex < records.length
          ? editingIndex
          : records.findIndex(
              (item) => getDocumentIdFromRecord(item) === trimmedDocId
            );

      const timestamp = new Date().toISOString();
      const nextRecord: SavedDocumentRecord = {
        document_ID: trimmedDocId,
        docId: trimmedDocId,
        id: trimmedDocId,
        type: summary.type,
        amount: summary.amount,
        vendor: summary.vendor,
        date: summary.date,
        image: imageSrc,
        ts: timestamp,
        payload: payloadToPersist,
      };

      const updatedRecords =
        existingIndex >= 0
          ? records.map((item, index) =>
              index === existingIndex ? { ...item, ...nextRecord } : item
            )
          : [...records, nextRecord];

      try {
        window.localStorage.setItem(
          "exportedDocuments",
          JSON.stringify(updatedRecords)
        );
        setIsExistingDocument(true);
        setEditingIndex(
          existingIndex >= 0 ? existingIndex : updatedRecords.length - 1
        );
      } catch (storageError) {
        console.warn("Failed to persist exported documents", storageError);
      }
    }

    try {
      await saveOcr();
    } catch {
      return;
    }

    setMessage(t("documentDetails.messages.saved"));
    setTimeout(() => setMessage(null), 2000);
  };

  const handleDiscard = async () => {
    try {
      await discardOcr();
    } catch {
      return;
    }

    if (isExistingDocument) {
      navigateBack();
      return;
    }

    clearPersistedImageData();
    clearPersistedOcrResult();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("ocrCsvContent");
      } catch (storageError) {
        console.warn("Failed to clear local CSV cache", storageError);
      }

      try {
        window.sessionStorage.removeItem("ocrCsvContent");
      } catch (storageError) {
        console.warn("Failed to clear session CSV cache", storageError);
      }
    }
    router.push("/documents/scan");
  };

  const header = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        onClick={() => {
          if (isExistingDocument) {
            navigateBack();
          } else {
            router.push("/documents/scan");
          }
        }}
      >
        <AppIcon name="arrow_back" className="h-7 w-7" />
      </button>
      <h2 className="text-lg font-bold">
        {t("documentDetails.header.title")}
      </h2>
      <div className="flex h-12 w-12 items-center justify-center rounded-full text-[#96c5a9]">
        <AppIcon name="edit" className="h-7 w-7" />
      </div>
    </div>
  );

  if (!hasInitialized || isLoading) {
    return (
      <AppLayout
        header={header}
        className="bg-[#111827] text-white"
        contentClassName="flex flex-col gap-6"
      >
        <section className="rounded-2xl bg-[#1F2937] p-6 text-center text-sm text-gray-400">
          {t("documentDetails.messages.loading")}
        </section>
      </AppLayout>
    );
  }

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
            onChange={(event) => {
              setDocumentClass(event.target.value);
              setMessage(null);
            }}
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
            onClick={() => {
              void handleDiscard();
            }}
            disabled={isConfirming}
          >
            {t("documentDetails.actions.discard")}
          </button>
          <button
            type="button"
            className="flex-1 rounded-full bg-[var(--primary-color)] py-3 text-center text-base font-bold text-[#111827]"
            onClick={() => {
              void handleSave();
            }}
            disabled={isConfirming}
          >
            {t("documentDetails.actions.save")}
          </button>
        </div>
      </section>
    </AppLayout>
  );
};

export default DocumentDetailsEdit;
