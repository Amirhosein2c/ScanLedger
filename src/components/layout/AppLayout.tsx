import type { ReactNode } from "react";
import clsx from "clsx";
import BottomNav from "../BottomNav";
import { Toaster } from "@/components/ui/sonner";

interface AppLayoutProps {
  header: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  isContentScrollable?: boolean;
  showBottomNav?: boolean;
}

const AppLayout = ({
  header,
  children,
  className,
  contentClassName,
  isContentScrollable = true,
  showBottomNav = true,
}: AppLayoutProps) => (
  <div
    className={clsx(
      "flex min-h-screen flex-col bg-[#111827] text-white",
      className
    )}
  >
    <header className="sticky top-0 z-40 bg-[#111827]/85 pt-safe backdrop-blur">
      <div className="px-4 pb-4 pt-6">{header}</div>
    </header>
    <main
      className={clsx(
        "flex flex-1 flex-col min-h-0",
        isContentScrollable ? "overflow-y-auto" : "overflow-hidden"
      )}
    >
      <div
        className={clsx(
          "flex-1 min-h-0 px-4",
          showBottomNav ? "pb-32" : "pb-12",
          contentClassName
        )}
      >
        {children}
      </div>
      <Toaster />
    </main>
    {showBottomNav && <BottomNav />}
  </div>
);

export default AppLayout;
