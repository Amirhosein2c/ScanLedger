"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FC } from "react";
import type { Route } from "next";
import { useTranslation } from "@/src/lib/i18n";

interface NavItem {
  to: Route;
  icon: string;
  labelKey: string;
}

const navItems: NavItem[] = [
  { to: "/documents/scan", icon: "camera_alt", labelKey: "navigation.scan" },
  { to: "/documents/search", icon: "folder", labelKey: "navigation.documents" },
  { to: "/dashboard", icon: "dashboard", labelKey: "navigation.dashboard" },
  { to: "/profile", icon: "settings", labelKey: "navigation.settings" },
];

const BottomNav: FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1F2937]">
      <nav className="mx-auto flex max-w-xl justify-around border-t border-[#1F2937] bg-[#1F2937] py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`flex flex-col items-center justify-end gap-1 ${
                isActive ? "text-white" : "text-gray-400"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <p className="text-xs font-medium">{t(item.labelKey)}</p>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
