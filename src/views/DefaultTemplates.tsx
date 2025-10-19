"use client";

import Link from "next/link";
import { useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  fields: string[];
}

const DefaultTemplates = () => {
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();
  const templates = useMemo<TemplateSummary[]>(
    () => [
      {
        id: "invoice-standard",
        name: t("templates.defaults.invoiceStandard.name"),
        description: t("templates.defaults.invoiceStandard.description"),
        fields: [
          t("templates.defaults.invoiceStandard.fields.invoiceNumber"),
          t("templates.defaults.invoiceStandard.fields.invoiceDate"),
          t("templates.defaults.invoiceStandard.fields.vendor"),
          t("templates.defaults.invoiceStandard.fields.subtotal"),
          t("templates.defaults.invoiceStandard.fields.tax"),
          t("templates.defaults.invoiceStandard.fields.total"),
          t("templates.defaults.invoiceStandard.fields.paymentTerms"),
        ],
      },
      {
        id: "receipt-retail",
        name: t("templates.defaults.retailReceipt.name"),
        description: t("templates.defaults.retailReceipt.description"),
        fields: [
          t("templates.defaults.retailReceipt.fields.merchant"),
          t("templates.defaults.retailReceipt.fields.purchaseDate"),
          t("templates.defaults.retailReceipt.fields.total"),
          t("templates.defaults.retailReceipt.fields.paymentMethod"),
          t("templates.defaults.retailReceipt.fields.cardLast4"),
        ],
      },
      {
        id: "statement-bank",
        name: t("templates.defaults.bankStatement.name"),
        description: t("templates.defaults.bankStatement.description"),
        fields: [
          t("templates.defaults.bankStatement.fields.accountName"),
          t("templates.defaults.bankStatement.fields.period"),
          t("templates.defaults.bankStatement.fields.openingBalance"),
          t("templates.defaults.bankStatement.fields.closingBalance"),
          t("templates.defaults.bankStatement.fields.totalTransactions"),
        ],
      },
    ],
    [t]
  );

  const header = (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        {t("templates.header.title")}
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        {t("templates.header.subtitle")}
      </p>
    </div>
  );

  return (
    <AppLayout
      header={header}
      className="bg-[#111827] text-white"
      contentClassName="space-y-4"
    >
      {templates.map((template) => (
        <Card key={template.id} className="bg-[#1F2937]">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{template.name}</CardTitle>
              <p className="mt-1 text-sm text-gray-400">
                {template.description}
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/5 hover:bg-white/10"
            >
              <Link href={`/templates/${template.id}`}>
                <span className="material-symbols-outlined text-3xl text-[var(--primary-color)]">
                  chevron_right
                </span>
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex flex-wrap gap-2">
              {template.fields.map((field) => (
                <span
                  key={field}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
                >
                  {field}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </AppLayout>
  );
};

export default DefaultTemplates;
