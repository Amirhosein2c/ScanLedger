import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import '../styles/documentDetailsEdit.css';
import { extractOcrFields, generateCsvFromFields, inferSummaryFromFields } from '../utils/ocr.js';

const normalizeFields = (fields) => {
  if (!Array.isArray(fields)) {
    return [];
  }
  const seen = new Set();
  return fields
    .map((field) => ({
      label: (field?.label ?? field?.name ?? field?.key ?? '').toString(),
      value: field?.value != null ? String(field.value) : ''
    }))
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

const detectInputType = (label, value) => {
  const lower = label.toLowerCase();
  if (lower.includes('date') || lower.includes('due')) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 'text' : 'date';
  }
  if (
    lower.includes('amount') ||
    lower.includes('total') ||
    lower.includes('price') ||
    lower.includes('subtotal') ||
    lower.includes('tax') ||
    (value && value.includes('$'))
  ) {
    return 'currency';
  }
  if (lower.includes('email')) {
    return 'email';
  }
  if (lower.includes('phone') || lower.includes('tel')) {
    return 'tel';
  }
  return 'text';
};

const formatDateForInput = (value) => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return '';
  }
  return new Date(parsed).toISOString().slice(0, 10);
};

const DocumentDetailsEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [imageSrc, setImageSrc] = useState('');
  const [fields, setFields] = useState([]);
  const [defaultForm, setDefaultForm] = useState({
    date: '',
    amount: '',
    vendor: '',
    category: 'Food & Drink'
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadImage = () => {
      try {
        const cached =
          sessionStorage.getItem('scannedImageDataUrl') || localStorage.getItem('scannedImageDataUrl');
        if (cached) {
          setImageSrc(cached);
        }
      } catch (error) {
        console.warn('Failed to read scanned image', error);
      }
    };

    const loadOcrData = async () => {
      try {
        const ocrUrl = searchParams.get('ocr_url');
        const ocrInline = searchParams.get('ocr');
        let raw = null;

        if (ocrUrl) {
          try {
            const res = await fetch(ocrUrl, { credentials: 'omit' });
            if (res.ok) {
              raw = await res.text();
            }
          } catch (error) {
            console.warn('Failed to load OCR data from URL', error);
          }
        } else if (ocrInline) {
          try {
            raw = decodeURIComponent(ocrInline);
            if (raw.startsWith('data:')) {
              const base64 = (raw.split(',')[1] || '').trim();
              raw = atob(base64);
            }
          } catch (error) {
            console.warn('Failed to parse inline OCR payload', error);
          }
        }

        if (!raw) {
          raw = sessionStorage.getItem('ocrResultData') || localStorage.getItem('ocrResultData');
        }

        if (!raw) {
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          console.warn('OCR data is not valid JSON, storing as raw text', error);
          parsed = { rawText: raw };
        }

        const extractedFields = normalizeFields(extractOcrFields(parsed));
        if (extractedFields.length > 0) {
          setFields(extractedFields);
        }
      } catch (error) {
        console.warn('Unable to load OCR data', error);
      }
    };

    loadImage();
    loadOcrData();
  }, [searchParams]);

  const handleFieldChange = (index, value) => {
    setFields((prev) =>
      prev.map((field, idx) => (idx === index ? { ...field, value } : field))
    );
  };

  const handleDefaultChange = (event) => {
    const { name, value } = event.target;
    setDefaultForm((prev) => ({ ...prev, [name]: value }));
  };

  const effectiveFields = useMemo(() => {
    if (fields.length > 0) {
      return fields;
    }
    return [
      { label: 'Date', value: defaultForm.date },
      { label: 'Amount', value: defaultForm.amount },
      { label: 'Vendor', value: defaultForm.vendor },
      { label: 'Category', value: defaultForm.category }
    ];
  }, [fields, defaultForm]);

  const handleDiscard = () => {
    try {
      sessionStorage.removeItem('scannedImageDataUrl');
      sessionStorage.removeItem('ocrResultData');
      localStorage.removeItem('scannedImageDataUrl');
      localStorage.removeItem('ocrResultData');
    } catch (error) {
      console.warn('Failed to clear cached scan', error);
    }
    navigate('/documents/scan');
  };

  const handleSave = () => {
    if (fields.length === 0) {
      if (!defaultForm.date && !defaultForm.amount && !defaultForm.vendor) {
        setMessage('Add at least one field or OCR result before saving.');
        return;
      }
    }

    try {
      const csvContent = generateCsvFromFields(effectiveFields);
      const payload = {
        display_fields: effectiveFields,
        csv_content: csvContent,
        timestamp: new Date().toISOString()
      };

      const serialized = JSON.stringify(payload);
      sessionStorage.setItem('ocrResultData', serialized);
      localStorage.setItem('ocrResultData', serialized);
      sessionStorage.setItem('ocrCsvContent', csvContent);
      localStorage.setItem('ocrCsvContent', csvContent);

      const summary = inferSummaryFromFields(effectiveFields, imageSrc);
      const rawSummaries = localStorage.getItem('exportedDocuments');
      const parsed = rawSummaries ? JSON.parse(rawSummaries) : [];
      parsed.unshift(summary);
      localStorage.setItem('exportedDocuments', JSON.stringify(parsed.slice(0, 50)));

      navigate('/dashboard');
    } catch (error) {
      console.warn('Failed to persist document data', error);
      setMessage('Failed to save document. Please try again.');
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#111827] text-white">
      <header className="sticky top-0 z-10 bg-[#111827] pt-safe shadow-sm">
        <div className="mt-8 flex items-center p-4">
          <button type="button" className="-ml-2 p-2" onClick={() => navigate('/documents/scan')}>
            <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
          </button>
          <h1 className="flex-1 pr-8 text-center text-xl font-bold tracking-tight">Review &amp; Edit</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto space-y-6 p-4 pb-32">
        <div className="aspect-[9/12] overflow-hidden rounded-2xl shadow-lg">
          {imageSrc ? (
            <img src={imageSrc} alt="Scanned Document" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#1F2937] text-sm text-white/60">
              No scanned image found.
            </div>
          )}
        </div>

        {fields.length > 0 ? (
          <div className="space-y-4">
            {fields.map((field, index) => {
              const inputType = detectInputType(field.label, field.value);
              if (inputType === 'date') {
                return (
                  <label key={field.label} className="block">
                    <span className="text-sm font-medium text-[#C7D2FE]">{field.label}</span>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                      value={formatDateForInput(field.value)}
                      onChange={(event) => handleFieldChange(index, event.target.value)}
                    />
                  </label>
                );
              }

              if (inputType === 'currency') {
                return (
                  <label key={field.label} className="block">
                    <span className="text-sm font-medium text-[#C7D2FE]">{field.label}</span>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#96c5a9]">
                        $
                      </span>
                      <input
                        className="block w-full rounded-xl border-transparent bg-[#1F2937] pl-8 pr-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                        value={field.value.replace(/[^0-9.-]/g, '')}
                        onChange={(event) => handleFieldChange(index, event.target.value)}
                      />
                    </div>
                  </label>
                );
              }

              return (
                <label key={field.label} className="block">
                  <span className="text-sm font-medium text-[#C7D2FE]">{field.label}</span>
                  <input
                    type={inputType}
                    className="mt-1 block w-full rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                    value={field.value}
                    onChange={(event) => handleFieldChange(index, event.target.value)}
                  />
                </label>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-[#C7D2FE]">Date</span>
              <input
                type="date"
                name="date"
                className="mt-1 block w-full rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                value={defaultForm.date}
                onChange={handleDefaultChange}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#C7D2FE]">Amount</span>
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
              <span className="text-sm font-medium text-[#C7D2FE]">Vendor</span>
              <input
                type="text"
                name="vendor"
                className="mt-1 block w-full rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                placeholder="e.g. Starbucks"
                value={defaultForm.vendor}
                onChange={handleDefaultChange}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#C7D2FE]">Category</span>
              <select
                name="category"
                className="mt-1 block w-full appearance-none rounded-xl border-transparent bg-[#1F2937] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
                value={defaultForm.category}
                onChange={handleDefaultChange}
              >
                <option>Groceries</option>
                <option>Transport</option>
                <option>Entertainment</option>
                <option>Food &amp; Drink</option>
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
            Discard
          </button>
          <button
            type="button"
            className="flex-1 rounded-full bg-[var(--primary-color)] py-3 text-center text-base font-bold text-[#111827]"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default DocumentDetailsEdit;
