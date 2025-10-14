'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import BottomNav from '../components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuthRedirect } from '../features/auth/hooks/useAuthRedirect';

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  fields: string[];
}

const DefaultTemplates = () => {
  useAuthRedirect({ redirectUnauthenticatedTo: '/login' });
  const templates = useMemo<TemplateSummary[]>(
    () => [
      {
        id: 'invoice-standard',
        name: 'Invoice (Standard)',
        description: 'Capture invoice number, date, totals, vendor, and payment terms.',
        fields: ['Invoice Number', 'Invoice Date', 'Vendor', 'Subtotal', 'Tax', 'Total']
      },
      {
        id: 'receipt-retail',
        name: 'Retail Receipt',
        description: 'Designed for point-of-sale receipts including merchant, total, and payment method.',
        fields: ['Merchant', 'Purchase Date', 'Total', 'Payment Method']
      },
      {
        id: 'statement-bank',
        name: 'Bank Statement',
        description: 'Monthly statements with opening balance, closing balance, and transactions.',
        fields: ['Account Name', 'Period', 'Opening Balance', 'Closing Balance']
      }
    ],
    []
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#111827] pb-24 text-white">
      <header className="sticky top-0 z-10 bg-[#111827]/80 backdrop-blur-sm">
        <div className="mt-8 p-4">
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="mt-2 text-sm text-gray-400">Start with a predefined extraction template or customize your own.</p>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4 pb-32">
        {templates.map((template) => (
          <Card key={template.id} className="bg-[#1F2937]">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{template.name}</CardTitle>
                <p className="mt-1 text-sm text-gray-400">{template.description}</p>
              </div>
              <Button asChild variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10">
                <Link href={`/templates/${template.id}`}>
                  <span className="material-symbols-outlined text-3xl text-[var(--primary-color)]">chevron_right</span>
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mt-2 flex flex-wrap gap-2">
                {template.fields.map((field) => (
                  <span key={field} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                    {field}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>

      <BottomNav />
    </div>
  );
};

export default DefaultTemplates;
