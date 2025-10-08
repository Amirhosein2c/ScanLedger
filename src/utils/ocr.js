export const extractOcrFields = (data) => {
  const fields = [];

  const sanitizeField = (label, value) => ({
    label: String(label || '').trim(),
    value: value != null ? String(value).trim() : ''
  });

  const pushObjectEntries = (obj) => {
    Object.entries(obj || {}).forEach(([key, value]) => {
      if (['display_fields', 'fields', 'csv_content', 'timestamp', 'raw'].includes(key)) {
        return;
      }
      const sanitized = sanitizeField(key, value);
      if (sanitized.label) {
        fields.push(sanitized);
      }
    });
  };

  const ingestArray = (arr) => {
    arr.forEach((item) => {
      if (!item) {
        return;
      }
      if (Array.isArray(item.display_fields)) {
        ingestArray(item.display_fields);
        return;
      }
      if (Array.isArray(item.fields)) {
        ingestArray(item.fields);
        return;
      }
      if (item.label || item.name || item.key) {
        const label = item.label || item.name || item.key;
        const value = 'value' in item ? item.value : item.data ?? item.text;
        const sanitized = sanitizeField(label, value);
        if (sanitized.label) {
          fields.push(sanitized);
        }
        return;
      }
      if (typeof item === 'object') {
        pushObjectEntries(item);
      }
    });
  };

  try {
    if (Array.isArray(data)) {
      ingestArray(data);
      return fields;
    }

    if (data?.display_fields) {
      ingestArray(data.display_fields);
    }
    if (data?.fields) {
      ingestArray(data.fields);
    }
    if (data?.raw) {
      ingestArray(Array.isArray(data.raw) ? data.raw : [data.raw]);
    }
    if (data?.data) {
      ingestArray(Array.isArray(data.data) ? data.data : [data.data]);
    }
    if (data?.items) {
      const mapped = data.items.map((item) => item?.json ?? item);
      ingestArray(mapped);
    }
    if (typeof data === 'object') {
      pushObjectEntries(data);
    }
  } catch (error) {
    console.warn('Failed to extract OCR fields', error);
  }

  return fields;
};

export const generateCsvFromFields = (fields) => {
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

export const inferSummaryFromFields = (fields, imageDataUrl) => {
  const lookup = (keywords) => {
    const keyList = Array.isArray(keywords) ? keywords : [keywords];
    const lowerCaseFields = fields.map((field) => ({
      ...field,
      label: field.label.toLowerCase(),
      value: field.value
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

  const docTypeGuess = () => {
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
