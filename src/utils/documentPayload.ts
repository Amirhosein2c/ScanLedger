type UnknownRecord = Record<string, unknown>;

export interface DocumentPayload {
  docId: string;
  documentClass: string;
  result: Record<string, string>;
  imageUrl?: string | null;
}

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseJsonIfPossible = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const toPlainObject = (value: unknown): UnknownRecord | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = parseJsonIfPossible(value);
    return parsed ? toPlainObject(parsed) : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = toPlainObject(item);
      if (candidate) {
        return candidate;
      }
    }
    return null;
  }

  if (isObject(value)) {
    return value;
  }

  return null;
};

const pickString = (record: UnknownRecord, keys: string[]): string => {
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed) {
        return trimmed;
      }
    } else if (raw != null && !Array.isArray(raw) && typeof raw !== "object") {
      const normalized = String(raw).trim();
      if (normalized) {
        return normalized;
      }
    }
  }
  return "";
};

export const mapToRecord = (source: unknown): Record<string, string> => {
  if (!source) {
    return {};
  }

  if (typeof source === "string") {
    const parsed = parseJsonIfPossible(source);
    return parsed ? mapToRecord(parsed) : {};
  }

  if (Array.isArray(source)) {
    return source.reduce<Record<string, string>>((acc, item) => {
      if (!isObject(item)) {
        return acc;
      }

      const labelRaw =
        item.label ?? item.name ?? item.key ?? item.field ?? item.column ?? "";
      const label =
        typeof labelRaw === "string"
          ? labelRaw.trim()
          : labelRaw != null
          ? String(labelRaw).trim()
          : "";

      if (!label) {
        return acc;
      }

      const valueSource =
        item.value ??
        item.text ??
        item.raw ??
        item.content ??
        item.result ??
        "";
      acc[label] =
        typeof valueSource === "string"
          ? valueSource
          : valueSource != null
          ? String(valueSource)
          : "";

      return acc;
    }, {});
  }

  if (isObject(source)) {
    return Object.entries(source).reduce<Record<string, string>>(
      (acc, [label, value]) => {
        const normalizedLabel =
          typeof label === "string" ? label.trim() : String(label).trim();
        if (!normalizedLabel) {
          return acc;
        }
        acc[normalizedLabel] =
          typeof value === "string"
            ? value
            : value != null
            ? String(value)
            : "";
        return acc;
      },
      {}
    );
  }

  return {};
};

const mergePayloadLayer = (record: UnknownRecord): UnknownRecord => {
  if (!record.payload) {
    return record;
  }
  const payloadRecord = toPlainObject(record.payload);
  if (!payloadRecord) {
    return record;
  }
  return {
    ...payloadRecord,
    imageUrl: record.imageUrl ?? record.image ?? payloadRecord.imageUrl,
  };
};

export const extractDocumentPayload = (
  value: unknown
): DocumentPayload | null => {
  const baseRecord = toPlainObject(value);
  if (!baseRecord) {
    return null;
  }

  const flattened = mergePayloadLayer(baseRecord);

  const docId = pickString(flattened, [
    "document_ID",
    "documentId",
    "docId",
    "document_id",
    "doc_id",
    "id",
    "documentID",
  ]);

  if (!docId) {
    return null;
  }

  const documentClass = pickString(flattened, [
    "documentClass",
    "document_class",
    "documentType",
    "document_type",
    "type",
    "category",
  ]);

  const imageUrl =
    pickString(flattened, [
      "imageUrl",
      "image_url",
      "image",
      "thumbnail",
      "preview",
      "previewUrl",
      "preview_url",
    ]) || null;

  const resultSource =
    flattened.result ??
    flattened.fields ??
    flattened.display_fields ??
    flattened.data ??
    flattened.raw ??
    {};

  return {
    docId,
    documentClass,
    result: mapToRecord(resultSource),
    imageUrl,
  };
};
