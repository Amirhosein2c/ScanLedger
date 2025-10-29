"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";
import { AppIcon } from "@/src/components/AppIcon";

interface TemplateFieldDefinition {
  labelKey: string;
  required: boolean;
}

interface TemplateDefinition {
  nameKey: string;
  descriptionKey: string;
  fields: TemplateFieldDefinition[];
}

const templates: Record<string, TemplateDefinition> = {
  "invoice-standard": {
    nameKey: "templates.defaults.invoiceStandard.name",
    descriptionKey: "templates.defaults.invoiceStandard.description",
    fields: [
      {
        labelKey: "templates.defaults.invoiceStandard.fields.invoiceNumber",
        required: true,
      },
      {
        labelKey: "templates.defaults.invoiceStandard.fields.invoiceDate",
        required: true,
      },
      {
        labelKey: "templates.defaults.invoiceStandard.fields.vendor",
        required: true,
      },
      {
        labelKey: "templates.defaults.invoiceStandard.fields.subtotal",
        required: false,
      },
      {
        labelKey: "templates.defaults.invoiceStandard.fields.tax",
        required: false,
      },
      {
        labelKey: "templates.defaults.invoiceStandard.fields.total",
        required: true,
      },
      {
        labelKey: "templates.defaults.invoiceStandard.fields.paymentTerms",
        required: false,
      },
    ],
  },
  "receipt-retail": {
    nameKey: "templates.defaults.retailReceipt.name",
    descriptionKey: "templates.defaults.retailReceipt.description",
    fields: [
      {
        labelKey: "templates.defaults.retailReceipt.fields.merchant",
        required: true,
      },
      {
        labelKey: "templates.defaults.retailReceipt.fields.purchaseDate",
        required: true,
      },
      {
        labelKey: "templates.defaults.retailReceipt.fields.total",
        required: true,
      },
      {
        labelKey: "templates.defaults.retailReceipt.fields.paymentMethod",
        required: false,
      },
      {
        labelKey: "templates.defaults.retailReceipt.fields.cardLast4",
        required: false,
      },
    ],
  },
  "statement-bank": {
    nameKey: "templates.defaults.bankStatement.name",
    descriptionKey: "templates.defaults.bankStatement.description",
    fields: [
      {
        labelKey: "templates.defaults.bankStatement.fields.accountName",
        required: true,
      },
      {
        labelKey: "templates.defaults.bankStatement.fields.period",
        required: true,
      },
      {
        labelKey: "templates.defaults.bankStatement.fields.openingBalance",
        required: true,
      },
      {
        labelKey: "templates.defaults.bankStatement.fields.closingBalance",
        required: true,
      },
      {
        labelKey: "templates.defaults.bankStatement.fields.totalTransactions",
        required: false,
      },
    ],
  },
};

const TemplateDetail = () => {
  const router = useRouter();
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();
  const params = useParams<{ templateId: string }>();
  const templateId = params?.templateId;

  const templateDefinition = useMemo<TemplateDefinition | null>(() => {
    if (!templateId) {
      return null;
    }
    return templates[templateId] || null;
  }, [templateId]);

  const template = useMemo(() => {
    if (!templateDefinition) {
      return null;
    }
    return {
      name: t(templateDefinition.nameKey),
      description: t(templateDefinition.descriptionKey),
      fields: templateDefinition.fields.map((field) => ({
        label: t(field.labelKey),
        required: field.required,
      })),
    };
  }, [t, templateDefinition]);

  const header = (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 rounded-full"
        onClick={() => router.push("/templates")}
      >
        <AppIcon name="arrow_back_ios_new" className="h-7 w-7" />
      </Button>
      <h1 className="flex-1 pr-8 text-center text-xl font-bold tracking-tight">
        {template ? template.name : t("templates.header.title")}
      </h1>
    </div>
  );

  if (!template) {
    return (
      <AppLayout
        header={header}
        className="bg-[#111827] text-white"
        contentClassName="flex items-center justify-center"
      >
        <Card className="mx-auto max-w-sm bg-[#1F2937] text-center">
          <CardHeader>
            <CardTitle>{t("templates.detail.notFound.title")}</CardTitle>
            <p className="text-sm text-white/60">
              {t("templates.detail.notFound.description")}
            </p>
          </CardHeader>
          <CardContent>
            <Button className="mt-2" onClick={() => router.push("/templates")}>
              {t("templates.detail.notFound.back")}
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      header={header}
      className="bg-[#111827] text-white"
      contentClassName="space-y-6"
    >
      <Card className="bg-[#1F2937]">
        <CardHeader>
          <CardTitle>{t("templates.detail.sections.overview")}</CardTitle>
          <p className="text-sm text-gray-400">{template.description}</p>
        </CardHeader>
      </Card>

      <Card className="bg-[#1F2937]">
        <CardHeader>
          <CardTitle>{t("templates.detail.sections.fields")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {template.fields.map((field) => (
            <div
              key={field.label}
              className="flex items-center justify-between rounded-xl bg-[#111827] px-4 py-3 text-sm"
            >
              <span>{field.label}</span>
              <Badge variant={field.required ? "default" : "secondary"}>
                {field.required
                  ? t("templates.detail.badges.required")
                  : t("templates.detail.badges.optional")}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-[#1F2937]">
        <CardHeader>
          <CardTitle>{t("templates.detail.sections.automation")}</CardTitle>
          <p className="text-sm text-gray-400">
            {t("templates.detail.automation.prefix")}{" "}
            <code className="rounded bg-black/40 px-2 py-1 text-xs">
              {templateId}
            </code>
            {t("templates.detail.automation.suffix")}
          </p>
        </CardHeader>
      </Card>
    </AppLayout>
  );
};

export default TemplateDetail;
