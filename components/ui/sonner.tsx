"use client";

import { useEffect } from "react";
import type { ComponentProps, CSSProperties } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast, type ExternalToast } from "sonner";
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";

type ToasterProps = ComponentProps<typeof Sonner>;
type Variant = "success" | "error" | "info" | "warning";
type CssVariableKeys =
  | "--bg"
  | "--fg"
  | "--bd"
  | "--icon-bg"
  | "--icon-fg"
  | "--close-fg"
  | "--close-bg-hover";

type ThemedStyle = CSSProperties & Partial<Record<CssVariableKeys, string>>;

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

  const mergedClassName = [
    "sonner-themed rounded-2xl px-4 py-3 shadow-lg border",
    opts.className,
  ]
    .filter(Boolean)
    .join(" ");

  const mergedStyle: ThemedStyle = {
    ...(opts.style ?? {}),
    "--bg": t.bg,
    "--fg": t.fg,
    "--bd": t.bd ?? "transparent",
    "--icon-bg": t.iconBg ?? "transparent",
    "--icon-fg": t.iconFg ?? t.fg,
    "--close-fg": t.closeFg ?? t.fg,
    "--close-bg-hover": t.closeHoverBg ?? "rgba(0,0,0,0.06)",
  };

  return {
    ...opts,
    className: mergedClassName,
    style: mergedStyle,
    icon: opts.icon ?? t.icon,
    // closeButton: opts.closeButton ?? true,
  };
}

export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  // Patch default toast.* so you don't have to import a custom "notify"
  useEffect(() => {
    type ToastHandler = (
      message: Parameters<typeof toast.success>[0],
      options?: ExternalToast
    ) => ReturnType<typeof toast.success>;

    const original = {
      success: toast.success.bind(toast) as ToastHandler,
      error: toast.error.bind(toast) as ToastHandler,
      info: toast.info.bind(toast) as ToastHandler,
      warning: toast.warning.bind(toast) as ToastHandler,
    };

    const patched = toast as typeof toast;

    patched.success = (message, options) =>
      original.success(message, themed("success", options));
    patched.error = (message, options) =>
      original.error(message, themed("error", options));
    patched.info = (message, options) =>
      original.info(message, themed("info", options));
    patched.warning = (message, options) =>
      original.warning(message, themed("warning", options));

    return () => {
      patched.success = original.success;
      patched.error = original.error;
      patched.info = original.info;
      patched.warning = original.warning;
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
