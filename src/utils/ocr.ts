export interface OcrField {
  label: string;
  value: string;
}

export interface OcrSummary {
  type: string;
  number: string;
  amount: string;
  vendor: string;
  date: string;
  image: string;
  ts: string;
}

const sanitizeField = (label: unknown, value: unknown): OcrField => ({
  label: String(label ?? '').trim(),
  value: value != null ? String(value).trim() : ''
});

const pushObjectEntries = (fields: OcrField[], obj: Record<string, unknown> | null | undefined): void => {
  if (!obj) {
    return;
  }

  Object.entries(obj).forEach(([key, value]) => {
    if (['display_fields', 'fields', 'csv_content', 'timestamp', 'raw'].includes(key)) {
      return;
    }
    const sanitized = sanitizeField(key, value);
    if (sanitized.label) {
      fields.push(sanitized);
    }
  });
};

const ingestArray = (fields: OcrField[], arr: unknown[]): void => {
  arr.forEach((item) => {
    if (!item) {
      return;
    }
    if (Array.isArray((item as { display_fields?: unknown }).display_fields)) {
      ingestArray(fields, ((item as { display_fields: unknown[] }).display_fields) ?? []);
      return;
    }
    if (Array.isArray((item as { fields?: unknown }).fields)) {
      ingestArray(fields, ((item as { fields: unknown[] }).fields) ?? []);
      return;
    }
    if (typeof item === 'object' && !Array.isArray(item)) {
      const typedItem = item as Record<string, unknown> & {
        label?: unknown;
        name?: unknown;
        key?: unknown;
        value?: unknown;
        data?: unknown;
        text?: unknown;
      };

      if (typedItem.label || typedItem.name || typedItem.key) {
        const label = typedItem.label ?? typedItem.name ?? typedItem.key;
        const value = 'value' in typedItem ? typedItem.value : typedItem.data ?? typedItem.text;
        const sanitized = sanitizeField(label, value);
        if (sanitized.label) {
          fields.push(sanitized);
        }
        return;
      }

      pushObjectEntries(fields, typedItem);
      return;
    }
  });
};

export const extractOcrFields = (data: unknown): OcrField[] => {
  const fields: OcrField[] = [];

  try {
    if (Array.isArray(data)) {
      ingestArray(fields, data);
      return fields;
    }

    const recordData = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;

    if (recordData?.display_fields) {
      const displayFields = Array.isArray(recordData.display_fields)
        ? recordData.display_fields
        : [recordData.display_fields];
      ingestArray(fields, displayFields);
    }
    if (recordData?.fields) {
      const fieldsArray = Array.isArray(recordData.fields) ? recordData.fields : [recordData.fields];
      ingestArray(fields, fieldsArray);
    }
    if (recordData?.raw) {
      const rawArray = Array.isArray(recordData.raw) ? recordData.raw : [recordData.raw];
      ingestArray(fields, rawArray);
    }
    if (recordData?.data) {
      const dataArray = Array.isArray(recordData.data) ? recordData.data : [recordData.data];
      ingestArray(fields, dataArray);
    }
    if (recordData?.items && Array.isArray(recordData.items)) {
      const mapped = recordData.items.map((item) => {
        if (typeof item === 'object' && item !== null) {
          const recordItem = item as Record<string, unknown>;
          return (recordItem.json as Record<string, unknown> | undefined) ?? item;
        }
        return item;
      });
      ingestArray(fields, mapped);
    }
    if (recordData) {
      pushObjectEntries(fields, recordData);
    }
  } catch (error) {
    console.warn('Failed to extract OCR fields', error);
  }

  return fields;
};

export const generateCsvFromFields = (fields: OcrField[]): string => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return '';
  }

  const header = ['Field', 'Value'];
  const lines = [header.join(',')];
  fields.forEach((field) => {
    const row = [
      `"${(field.label || '').replace(/"/g, '""')}"`,
      `"${(field.value || '').replace(/"/g, '""')}"`
    ];
    lines.push(row.join(','));
  });
  return lines.join('\n');
};

export const inferSummaryFromFields = (fields: OcrField[], imageDataUrl?: string): OcrSummary => {
  const lookup = (keywords: string | string[]): string => {
    const keyList = Array.isArray(keywords) ? keywords : [keywords];
    const lowerCaseFields = fields.map((field) => ({
      ...field,
      label: field.label.toLowerCase()
    }));

    for (const keyword of keyList) {
      const key = keyword.toLowerCase();
      const hit = lowerCaseFields.find((field) => field.label.includes(key));
      if (hit) {
        return hit.value;
      }
    }
    return '';
  };

  const amount = lookup(['amount', 'total', 'grand']);
  const vendor = lookup(['vendor', 'issuer', 'merchant', 'company']);
  const number = lookup(['number', 'invoice', 'receipt', '#']);
  const dateValue = lookup(['date', 'due', 'issued']);

  const docTypeGuess = (): string => {
    const tokens = `${fields.map((f) => f.label).join(' ')} ${number}`.toLowerCase();
    if (tokens.includes('invoice')) return 'Invoice';
    if (tokens.includes('receipt')) return 'Receipt';
    if (tokens.includes('statement')) return 'Statement';
    return 'Document';
  };

  return {
    type: docTypeGuess(),
    number,
    amount,
    vendor,
    date:
      dateValue ||
      new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }),
    image: imageDataUrl || '',
    ts: new Date().toISOString()
  };
};
