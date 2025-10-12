import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

interface TemplateField {
  label: string;
  required: boolean;
}

interface TemplateDefinition {
  name: string;
  description: string;
  fields: TemplateField[];
}

const templates: Record<string, TemplateDefinition> = {
  'invoice-standard': {
    name: 'Invoice (Standard)',
    description: 'Capture invoice number, date, totals, vendor, and payment terms.',
    fields: [
      { label: 'Invoice Number', required: true },
      { label: 'Invoice Date', required: true },
      { label: 'Vendor', required: true },
      { label: 'Subtotal', required: false },
      { label: 'Tax', required: false },
      { label: 'Total', required: true },
      { label: 'Payment Terms', required: false }
    ]
  },
  'receipt-retail': {
    name: 'Retail Receipt',
    description: 'Designed for point-of-sale receipts including merchant, total, and payment method.',
    fields: [
      { label: 'Merchant', required: true },
      { label: 'Purchase Date', required: true },
      { label: 'Total', required: true },
      { label: 'Payment Method', required: false },
      { label: 'Card Last 4', required: false }
    ]
  },
  'statement-bank': {
    name: 'Bank Statement',
    description: 'Monthly statements with opening balance, closing balance, and transactions.',
    fields: [
      { label: 'Account Name', required: true },
      { label: 'Period', required: true },
      { label: 'Opening Balance', required: true },
      { label: 'Closing Balance', required: true },
      { label: 'Total Transactions', required: false }
    ]
  }
};

const TemplateDetail = () => {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();

  const template = useMemo<TemplateDefinition | null>(() => {
    if (!templateId) {
      return null;
    }
    return templates[templateId] || null;
  }, [templateId]);

  if (!template) {
    return (
      <div className="flex min-h-screen flex-col bg-[#111827] text-white">
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold">Template not found</p>
            <button
              type="button"
              className="mt-4 rounded-full bg-[var(--primary-color)] px-6 py-2 text-sm font-bold text-[#111827]"
              onClick={() => navigate('/templates')}
            >
              Back to Templates
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#111827] text-white">
      <header className="sticky top-0 z-10 bg-[#111827]/80 backdrop-blur-sm">
        <div className="mt-8 flex items-center p-4">
          <button type="button" className="-ml-2 p-2" onClick={() => navigate('/templates')}>
            <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
          </button>
          <h1 className="flex-1 pr-8 text-center text-xl font-bold tracking-tight">{template.name}</h1>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-4 pb-32">
        <section className="rounded-2xl bg-[#1F2937] p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="mt-2 text-sm text-gray-400">{template.description}</p>
        </section>

        <section className="rounded-2xl bg-[#1F2937] p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Fields</h2>
          <div className="mt-4 space-y-3">
            {template.fields.map((field) => (
              <div
                key={field.label}
                className="flex items-center justify-between rounded-xl bg-[#111827] px-4 py-3 text-sm"
              >
                <span>{field.label}</span>
                {field.required ? (
                  <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200">
                    Required
                  </span>
                ) : (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">Optional</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-[#1F2937] p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Automation</h2>
          <p className="text-sm text-gray-400">
            Use this template in your n8n workflow by referencing the template ID{' '}
            <code className="rounded bg-black/40 px-2 py-1 text-xs">{templateId}</code>. Fields will be mapped to the OCR
            output automatically.
          </p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default TemplateDetail;
