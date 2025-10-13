'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import BottomNav from '../components/BottomNav';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

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
  const router = useRouter();
  const params = useParams<{ templateId: string }>();
  const templateId = params?.templateId;

  const template = useMemo<TemplateDefinition | null>(() => {
    if (!templateId) {
      return null;
    }
    return templates[templateId] || null;
  }, [templateId]);

  if (!template) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#111827] text-white">
        <Card className="mx-4 max-w-sm bg-[#1F2937] text-center">
          <CardHeader>
            <CardTitle>Template not found</CardTitle>
            <p className="text-sm text-white/60">The requested template does not exist.</p>
          </CardHeader>
          <CardContent>
            <Button className="mt-2" onClick={() => router.push('/templates')}>
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#111827] pb-24 text-white">
      <header className="sticky top-0 z-10 bg-[#111827]/80 backdrop-blur-sm">
        <div className="mt-8 flex items-center p-4">
          <Button variant="ghost" size="icon" className="-ml-2 rounded-full" onClick={() => router.push('/templates')}>
            <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
          </Button>
          <h1 className="flex-1 pr-8 text-center text-xl font-bold tracking-tight">{template.name}</h1>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-4 pb-32">
        <Card className="bg-[#1F2937]">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <p className="text-sm text-gray-400">{template.description}</p>
          </CardHeader>
        </Card>

        <Card className="bg-[#1F2937]">
          <CardHeader>
            <CardTitle>Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {template.fields.map((field) => (
              <div
                key={field.label}
                className="flex items-center justify-between rounded-xl bg-[#111827] px-4 py-3 text-sm"
              >
                <span>{field.label}</span>
                <Badge variant={field.required ? 'default' : 'secondary'}>
                  {field.required ? 'Required' : 'Optional'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#1F2937]">
          <CardHeader>
            <CardTitle>Automation</CardTitle>
            <p className="text-sm text-gray-400">
              Use this template in your n8n workflow by referencing the template ID{' '}
              <code className="rounded bg-black/40 px-2 py-1 text-xs">{templateId}</code>. Fields will be mapped to the OCR
              output automatically.
            </p>
          </CardHeader>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default TemplateDetail;
