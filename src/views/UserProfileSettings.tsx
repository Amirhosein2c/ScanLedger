"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";
import {
  clearStoredUserData,
  getStoredUserData,
} from "../features/auth/profile";
import { AppIcon } from "@/src/components/AppIcon";
import { toast } from "sonner";

interface ProfileState {
  name: string;
  surname: string;
  email: string;
}

const UserProfileSettings = () => {
  const router = useRouter();
  useAuthRedirect({ redirectUnauthenticatedTo: "/login" });
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    surname: "",
    email: "",
  });
  // const [message, setMessage] = useState<string | null>(null);
  const [picture, setPicture] = useState<string>(
    `https://www.gravatar.com/avatar/?d=mp&s=128`
  );

  useEffect(() => {
    const stored = getStoredUserData();
    if (!stored) {
      setPicture(`https://www.gravatar.com/avatar/?d=mp&s=128`);
      return;
    }
    setProfile({
      name: stored.User_name || "",
      surname: stored.User_surname || "",
      email: stored.User_email || "",
    });
    setPicture(
      stored.User_picture || `https://www.gravatar.com/avatar/?d=mp&s=128`
    );
  }, []);

  const fullName = useMemo(() => {
    const name = [profile.name, profile.surname]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || t("profile.guestUser");
  }, [profile.name, profile.surname, t]);

  const handleLogout = () => {
    if (typeof window === "undefined") {
      return;
    }
    clearStoredUserData();

    router.push("/login");
  };

  const handleTempAction = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      toast.info(t("profile.messages.comingSoon"));
      // setMessage(t("profile.messages.comingSoon"));
      // setTimeout(() => setMessage(null), 2000);
    },
    [t]
  );

  const handleTemplateAction = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      router.push("/templates");
    },
    [t]
  );

  const sections = useMemo(
    () =>
      [
        {
          title: t("profile.sections.templates.title"),
          items: [
            {
              label: t("profile.sections.templates.items.default"),
              action: handleTemplateAction,
            },
            {
              label: t("profile.sections.templates.items.add"),
              action: handleTempAction,
            },
          ],
        },
        {
          title: t("profile.sections.export.title"),
          items: [
            {
              label: t("profile.sections.export.items.destination"),
              action: handleTempAction,
            },
            {
              label: t("profile.sections.export.items.format"),
              action: handleTempAction,
            },
          ],
        },
        {
          title: t("profile.sections.support.title"),
          items: [
            {
              label: t("profile.sections.support.items.help"),
              action: handleTempAction,
            },
            {
              label: t("profile.sections.support.items.contact"),
              action: handleTempAction,
            },
          ],
        },
      ] as const,
    [handleTempAction, handleTemplateAction, t]
  );

  const header = (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1 rounded-full bg-white/5 hover:bg-white/10"
        onClick={() => router.back()}
      >
        <AppIcon name="arrow_back_ios_new" className="h-6 w-6" />
      </Button>
      <h1 className="flex-1 pr-12 text-center text-xl font-semibold tracking-tight">
        {t("profile.header.title")}
      </h1>
    </div>
  );

  return (
    <AppLayout
      header={header}
      className="bg-[#0F172A] text-white"
      isContentScrollable
      contentClassName="flex-none flex flex-col gap-8 px-5"
    >
      <Card className="bg-[#131C2E] text-center">
        <CardHeader className="flex items-center gap-3 text-center">
          <div
            className="size-28 rounded-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${picture})`,
              backgroundColor: "#374151",
            }}
          />

          <div className="flex flex-col items-center">
            <CardTitle className="text-2xl font-semibold text-white">
              {fullName}
            </CardTitle>
            <Badge variant="success" className="mt-2">
              {t("profile.badge.freeMember")}
            </Badge>
            {profile.email && (
              <p className="mt-2 text-xs text-white/60">{profile.email}</p>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-6 overflow-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              {section.title}
            </h3>
            <Card className="overflow-hidden bg-[#131C2E]">
              <CardContent className="p-0">
                {section.items.map((item, index) => (
                  <div key={item.label}>
                    <Button
                      variant="ghost"
                      className="flex w-full items-center justify-between rounded-none px-5 py-4 text-left text-sm font-medium text-white hover:bg-white/5"
                      onClick={item.action}
                    >
                      <span>{item.label}</span>
                      <AppIcon
                        name="chevron_right"
                        className="h-5 w-5 text-white/40"
                      />
                    </Button>
                    {index !== section.items.length - 1 && (
                      <Separator className="bg-white/5" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Card className="bg-[#131C2E]">
        <CardContent className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-base font-semibold text-red-300">
              {t("profile.logout.title")}
            </p>
            <p className="text-xs text-white/50">
              {t("profile.logout.subtitle")}
            </p>
          </div>
          <Button
            variant="outline"
            className="border-red-400/40 text-red-300 hover:bg-red-500/10"
            onClick={handleLogout}
          >
            <AppIcon name="logout" className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* {message && (
        <Card className="border-emerald-400/40 bg-emerald-500/10">
          <CardContent className="px-4 py-3 text-center text-sm text-emerald-200">
            {message}
          </CardContent>
        </Card>
      )} */}
    </AppLayout>
  );
};

export default UserProfileSettings;
