"use client";

import { useRouter } from "next/navigation";
import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import AppLayout from "../components/layout/AppLayout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";
import { AppIcon } from "@/src/components/AppIcon";
import { getStoredUserData, storage } from "../features/auth/profile";

interface DocumentSummary {
  id?: string;
  docId?: string;
  type?: string;
  number?: string;
  vendor?: string;
  amount?: string;
  date?: string;
  status?: string;
  image?: string;
  payload?: {
    documentClass: string;
    result: Record<string, string>;
  };
  ts?: string;
}

interface RecentScanCardProps {
  document: DocumentSummary;
  onSelect: () => void;
}

const RecentScanCard = ({ document, onSelect }: RecentScanCardProps) => {
  const { t } = useTranslation();
  const thumbnailStyle = useMemo<CSSProperties>(() => {
    if (!document.image) {
      return {};
    }
    return {
      backgroundImage: `url('${document.image}')`,
    };
  }, [document.image]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="flex items-center gap-4 rounded-2xl bg-[#1F2937] p-3 cursor-pointer transition hover:bg-[#273248] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
    >
      <div
        className="size-14 rounded-lg bg-cover bg-center bg-no-repeat"
        style={thumbnailStyle}
      />
      <div className="flex-1">
        <p className="line-clamp-1 text-base font-medium text-white">
          {document.type || t("documents.common.document")}
          {document.number ? ` #${document.number}` : ""}
        </p>
        <p className="line-clamp-2 text-sm text-[#D1D5DB]">
          {document.date || ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-base font-bold text-white">
          {document.amount
            ? document.amount.startsWith("$")
              ? document.amount
              : `$${document.amount}`
            : ""}
        </p>
        <p className="text-sm text-[#D1D5DB]">{document.vendor || ""}</p>
      </div>
    </div>
  );
};

const DashboardOverview = () => {
  const router = useRouter();
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();
  const [userName, setUserName] = useState<string>(() =>
    t("dashboard.defaultUserName")
  );
  const [recentScans, setRecentScans] = useState<DocumentSummary[]>([]);

  const [picture, setPicture] = useState<string>("");

  useEffect(() => {
    if (storage) {
      const profile = storage.getItem("user_login_raw");
      if (profile) {
        let profArr = JSON.parse(profile);
        const localStoragePicture =
          profArr[0]?.User_Picture ||
          `https://www.gravatar.com/avatar/?d=mp&s=128`;
        setPicture(localStoragePicture);
      }
    }

    // const localStoragePicture =
    //   window.localStorage.getItem("user_picture") ||
    //   `https://www.gravatar.com/avatar/?d=mp&s=128`;
    // setPicture(localStoragePicture);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let profile = getStoredUserData();
    // const firstName = window.localStorage.getItem("user_name") || "";
    // const surname = window.localStorage.getItem("user_surname") || "";
    const fullName = `${profile?.User_Name} ${profile?.User_Surname}`.trim();
    setUserName(fullName || t("dashboard.defaultUserName"));

    try {
      const raw = window.localStorage.getItem("exportedDocuments");
      if (!raw) {
        setRecentScans([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = (parsed as DocumentSummary[]).map((doc, index) => ({
          ...doc,
          docId: doc.docId || doc.id || doc.ts || `doc-${index}`,
        }));
        setRecentScans(normalized.slice(0, 5));
      } else {
        setRecentScans([]);
      }
    } catch (error) {
      console.warn("Failed to parse recent scans", error);
      setRecentScans([]);
    }
  }, [t]);

  const header = (
    <div className="flex items-center gap-4">
      <div
        className="size-10 rounded-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${picture})`,
          backgroundColor: "#374151",
        }}
      />
      <div>
        <p className="text-sm text-gray-400">
          {t("dashboard.header.welcomeBack")}
        </p>
        <h1 className="text-xl font-bold text-white">{userName}</h1>
      </div>
    </div>
  );

  return (
    <AppLayout
      header={header}
      className="bg-[#111827] text-white"
      contentClassName="flex flex-col gap-8"
    >
      <section className="grid grid-cols-2 gap-4">
        <Card className="bg-[#1F2937]">
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="text-sm font-medium text-gray-300">
              {t("dashboard.stats.totalDocs")}
            </p>
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-sm font-medium text-[var(--primary-color)]">
              0%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#1F2937]">
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="text-sm font-medium text-gray-300">
              {t("dashboard.stats.monthlyScans")}
            </p>
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-sm font-medium text-[var(--primary-color)]">
              0%
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">
          {t("dashboard.recentScans.title")}
        </h2>
        <div className="space-y-2">
          {recentScans.length === 0 && (
            <p className="text-sm text-gray-400">
              {t("dashboard.recentScans.empty")}
            </p>
          )}
          {recentScans.map((doc, index) => (
            <RecentScanCard
              key={`${doc.docId || doc.id || doc.number || index}`}
              document={doc}
              onSelect={() => {
                const identifier =
                  doc.docId || doc.id || doc.ts || String(index);
                router.push(
                  `/documents/details?id=${encodeURIComponent(identifier)}`
                );
              }}
            />
          ))}
        </div>
      </section>

      <div className="flex justify-center pb-4">
        <Button
          size="lg"
          className="h-14 w-full max-w-xs text-base font-semibold"
          onClick={() => router.push("/documents/scan")}
        >
          <AppIcon name="qr_code_scanner" className="h-5 w-5" />
          <span className="ml-2">{t("dashboard.actions.scanNewDocument")}</span>
        </Button>
      </div>
    </AppLayout>
  );
};

export default DashboardOverview;
