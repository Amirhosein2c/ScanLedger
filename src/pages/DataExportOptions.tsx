import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';
import '../styles/dataExportOptions.css';
import { generateCsvFromFields, type OcrField } from '../utils/ocr';

const DataExportOptions = () => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedCsv = window.sessionStorage.getItem('ocrCsvContent') || window.localStorage.getItem('ocrCsvContent');
      if (storedCsv) {
        setCsvContent(storedCsv);
        return;
      }

      const raw = window.localStorage.getItem('ocrResultData') || window.sessionStorage.getItem('ocrResultData');
      if (raw) {
        const parsed = JSON.parse(raw) as { display_fields?: OcrField[] | unknown };
        if (Array.isArray(parsed?.display_fields)) {
          const generated = generateCsvFromFields(parsed.display_fields);
          setCsvContent(generated);
        }
      }
    } catch (error) {
      console.warn('Failed to load CSV content', error);
    }
  }, []);

  const handleDownloadCsv = () => {
    if (!csvContent) {
      setMessage('No CSV content available yet.');
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scanledger-export-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage('CSV export started.');
    setTimeout(() => setMessage(null), 2500);
  };

  const handleCopyCsv = () => {
    if (!csvContent) {
      setMessage('No CSV content to copy.');
      return;
    }
    if (!navigator.clipboard) {
      setMessage('Clipboard access is not available.');
      return;
    }
    navigator.clipboard
      .writeText(csvContent)
      .then(() => {
        setMessage('CSV copied to clipboard.');
        setTimeout(() => setMessage(null), 2500);
      })
      .catch(() => setMessage('Failed to copy CSV.'));
  };

  const handleClearExports = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem('exportedDocuments');
    window.localStorage.removeItem('ocrResultData');
    window.localStorage.removeItem('ocrCsvContent');
    window.sessionStorage.removeItem('ocrResultData');
    window.sessionStorage.removeItem('ocrCsvContent');
    setCsvContent('');
    setMessage('Export history cleared.');
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#111827] text-white">
      <header className="sticky top-0 z-10 bg-[#111827]/80 backdrop-blur-sm">
        <div className="mt-8 p-4">
          <h1 className="text-2xl font-bold tracking-tight">Export Options</h1>
          <p className="mt-2 text-sm text-gray-400">Download your OCR results or share them with other systems.</p>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-4 pb-32">
        <section className="space-y-4 rounded-2xl bg-[#1F2937] p-6 shadow-lg">
          <h2 className="text-lg font-semibold">CSV Export</h2>
          <p className="text-sm text-gray-400">
            Export your recent OCR results as a CSV file for Excel, Google Sheets, or your accounting software.
          </p>
          <button
            type="button"
            className="w-full rounded-full bg-[var(--primary-color)] py-3 text-base font-bold text-[#111827]"
            onClick={handleDownloadCsv}
          >
            Download CSV
          </button>
          <button
            type="button"
            className="w-full rounded-full bg-white/10 py-3 text-base font-semibold text-white hover:bg-white/15"
            onClick={handleCopyCsv}
          >
            Copy CSV to Clipboard
          </button>
        </section>

        <section className="space-y-4 rounded-2xl bg-[#1F2937] p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Integrations</h2>
          <p className="text-sm text-gray-400">
            Webhooks and direct integrations are handled by the ScanLedger automation workflows.
          </p>
          <p className="text-sm text-gray-500">Configure destinations in your n8n workflow to sync exports automatically.</p>
        </section>

        <section className="space-y-4 rounded-2xl bg-[#1F2937] p-6 shadow-lg">
          <h2 className="text-lg font-semibold">History</h2>
          <p className="text-sm text-gray-400">
            Manage stored documents on this device. Clearing history does not remove records from backend storage.
          </p>
          <button
            type="button"
            className="w-full rounded-full border border-red-400/60 py-3 text-base font-semibold text-red-200"
            onClick={handleClearExports}
          >
            Clear Local Export History
          </button>
        </section>

        {message && (
          <div className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-4 py-2 text-center text-sm text-emerald-200">
            {message}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default DataExportOptions;
