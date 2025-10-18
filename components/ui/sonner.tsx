"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast, type ExternalToast } from "sonner";
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;
type Variant = "success" | "error" | "info" | "warning";

const THEME: Record<
  Variant,
  {
    bg: string;
    fg: string;
    bd?: string;
    iconBg?: string;
    iconFg?: string;
    closeFg?: string;
    closeHoverBg?: string;
    icon: JSX.Element;
  }
> = {
  success: {
    bg: "#059669",
    fg: "#fff",
    bd: "rgba(255,255,255,0.25)",
    iconBg: "rgba(255,255,255,0.18)",
    iconFg: "#fff",
    closeFg: "#fff",
    closeHoverBg: "rgba(255,255,255,0.16)",
    icon: <CheckCircle2 className="size-5" strokeWidth={2.2} />,
  },
  error: {
    bg: "#e11d48",
    fg: "#fff",
    bd: "rgba(255,255,255,0.28)",
    iconBg: "rgba(255,255,255,0.20)",
    iconFg: "#fff",
    closeFg: "#fff",
    closeHoverBg: "rgba(255,255,255,0.16)",
    icon: <XCircle className="size-5" strokeWidth={2.2} />,
  },
  warning: {
    bg: "#f59e0b",
    fg: "#111827",
    bd: "rgba(0,0,0,0.12)",
    iconBg: "rgba(0,0,0,0.08)",
    iconFg: "#111827",
    closeFg: "#111827",
    closeHoverBg: "rgba(0,0,0,0.08)",
    icon: <AlertTriangle className="size-5" strokeWidth={2.2} />,
  },
  info: {
    bg: "#0284c7",
    fg: "#fff",
    bd: "rgba(255,255,255,0.22)",
    iconBg: "rgba(255,255,255,0.18)",
    iconFg: "#fff",
    closeFg: "#fff",
    closeHoverBg: "rgba(255,255,255,0.16)",
    icon: <Info className="size-5" strokeWidth={2.2} />,
  },
};

function themed(variant: Variant, opts: ExternalToast = {}): ExternalToast {
  const t = THEME[variant];
  return {
    ...opts,
    className: [
      "sonner-themed rounded-2xl px-4 py-3 shadow-lg border",
      opts.className,
    ]
      .filter(Boolean)
      .join(" "),
    style: {
      ...opts.style,
      ["--bg" as any]: t.bg,
      ["--fg" as any]: t.fg,
      ["--bd" as any]: t.bd ?? "transparent",
      ["--icon-bg" as any]: t.iconBg ?? "transparent",
      ["--icon-fg" as any]: t.iconFg ?? t.fg,
      ["--close-fg" as any]: t.closeFg ?? t.fg,
      ["--close-bg-hover" as any]: t.closeHoverBg ?? "rgba(0,0,0,0.06)",
    },
    icon: opts.icon ?? t.icon,
    // closeButton: opts.closeButton ?? true,
  };
}

export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  // Patch default toast.* so you don't have to import a custom "notify"
  useEffect(() => {
    const s = toast.success.bind(toast);
    const e = toast.error.bind(toast);
    const i = toast.info.bind(toast);
    const w = toast.warning.bind(toast);
    (toast as any).success = (m: any, o?: ExternalToast) =>
      s(m, themed("success", o));
    (toast as any).error = (m: any, o?: ExternalToast) =>
      e(m, themed("error", o));
    (toast as any).info = (m: any, o?: ExternalToast) =>
      i(m, themed("info", o));
    (toast as any).warning = (m: any, o?: ExternalToast) =>
      w(m, themed("warning", o));
    return () => {
      (toast as any).success = s;
      (toast as any).error = e;
      (toast as any).info = i;
      (toast as any).warning = w;
    };
  }, []);

  return (
    <>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        position="bottom-center"
        offset={70}
        mobileOffset={{ bottom: 70 }}
        duration={4000}
        className="toaster"
        toastOptions={{
          classNames: {
            toast: "rounded-2xl px-4 py-3 shadow-lg border",
            title: "font-semibold",
            description: "text-sm/6 opacity-90",
            icon: "grid place-items-center rounded-full size-9",
            closeButton:
              "grid place-items-center rounded-lg size-8 transition-colors",
          },
        }}
        icons={{
          success: THEME.success.icon,
          error: THEME.error.icon,
          info: THEME.info.icon,
          warning: THEME.warning.icon,
        }}
        {...props}
      />

      {/* Styles that consume the inline CSS variables; scoped to .sonner-themed */}
      <style jsx global>{`
        [data-sonner-toast].sonner-themed {
          background: var(--bg) !important;
          color: var(--fg) !important;
          border-color: var(--bd) !important;
          backdrop-filter: blur(12px);
        }
        [data-sonner-toast].sonner-themed [data-icon] {
          background: var(--icon-bg) !important;
          color: var(--icon-fg) !important;
        }
        [data-sonner-toast].sonner-themed [data-close-button] {
          color: var(--close-fg) !important;
        }
        [data-sonner-toast].sonner-themed [data-close-button]:hover {
          background: var(--close-bg-hover) !important;
        }
      `}</style>
    </>
  );
}
