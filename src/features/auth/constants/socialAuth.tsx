import * as React from "react";

export type ProviderKey = "google" | "facebook" | "microsoft" | "apple";

export type BuildSocialButtonsDeps = {
  t: (key: string) => string;
  isBusy?: boolean;
  isGoogleLoading?: boolean;
  onGoogle: () => void | Promise<void>;
  providers?: ProviderKey[];
};

export type SocialBtnItem = {
  id: ProviderKey;
  className: string;
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
  disabled?: boolean;
};

/* ---- Inline SVG icons (24x24, tailwind-sized via className) ---- */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.8h5.3c-.2 1.2-1.6 3.6-5.3 3.6-3.2 0-5.9-2.6-5.9-5.8s2.7-5.8 5.9-5.8c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.8 3.1 14.6 2 12 2 6.9 2 2.7 6.1 2.7 11.2S6.9 20.4 12 20.4c6.9 0 9.1-4.8 8.5-9.2H12z"
    />
    <path
      fill="#34A853"
      d="M3.9 7.1 7.1 9.5c.8-2.3 3-3.9 5.4-3.9 1.8 0 3 .8 3.7 1.5l2.5-2.4C16.8 3.1 14.6 2 12 2 8.4 2 5.3 4 3.9 7.1z"
      opacity=".001"
    />
    <path
      fill="#FBBC05"
      d="M12 22c4.6 0 8.5-3.1 8.5-6.8 0-.6-.1-1.2-.3-1.8H12v3.8h5.3c-.2 1.2-1.6 3.6-5.3 3.6-2.6 0-4.8-1.6-5.5-3.9l-3.2 2.5C5.4 20.6 8.4 22 12 22z"
      opacity=".001"
    />
    <path
      fill="#4285F4"
      d="M12 10.2v3.8h5.3c.2-1.1.3-2.2.3-3.1 0-.7-.1-1.3-.2-1.9H12z"
      opacity=".001"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="white">
    <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <rect x="2" y="2" width="9" height="9" fill="#F25022" />
    <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
    <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
    <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
  </svg>
);

const AppleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    fill="currentColor"
  >
    <path d="M16.365 1.43c0 1.14-.47 2.244-1.221 3.045-.78.83-2.07 1.473-3.203 1.381-.13-1.125.493-2.302 1.23-3.078.806-.84 2.188-1.453 3.194-1.348zM20.74 17.24c-.59 1.37-.88 1.98-1.65 3.19-1.07 1.66-2.58 3.73-4.43 3.76-1.66.03-2.1-1.09-4.37-1.08-2.28.01-2.76 1.11-4.42 1.08-1.85-.03-3.27-1.88-4.34-3.53C-.18 18.78-.91 15.64.5 13.19c.95-1.65 2.65-2.68 4.49-2.71 1.76-.03 3.42 1.19 4.35 1.19.93 0 2.49-1.46 4.2-1.24.71.03 2.72.29 4 2.19-.1.06-2.39 1.4-1.8 4.62z" />
  </svg>
);

/** Base visual catalog (styles + icons) */
const BASE: Record<ProviderKey, Pick<SocialBtnItem, "className" | "icon">> = {
  google: {
    className:
      "flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-white py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60",
    icon: <GoogleIcon />,
  },
  facebook: {
    className:
      "flex w-full items-center justify-center gap-3 rounded-md bg-[#1877f3] py-3 text-sm font-medium text-white transition-colors hover:bg-[#166fe0] disabled:cursor-not-allowed disabled:opacity-60",
    icon: <FacebookIcon />,
  },
  microsoft: {
    className:
      "flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-[#111827] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60",
    icon: <MicrosoftIcon />,
  },
  apple: {
    className:
      "flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-black py-3 text-sm font-medium text-white transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60",
    icon: <AppleIcon />,
  },
};

/** Build the array you’ll map over in JSX */
export function buildSocialAuthButtons({
  t,
  isBusy = false,
  isGoogleLoading = false,
  onGoogle,
  providers = ["google"],
}: BuildSocialButtonsDeps): SocialBtnItem[] {
  const items: SocialBtnItem[] = [];

  if (providers.includes("google")) {
    items.push({
      id: "google",
      className: BASE.google.className,
      icon: BASE.google.icon,
      text: isGoogleLoading
        ? t("auth.login.status.connectingGoogle")
        : t("auth.login.actions.google"),
      onClick: onGoogle,
      disabled: isGoogleLoading || isBusy,
    });
  }
  if (providers.includes("facebook")) {
    items.push({
      id: "facebook",
      className: BASE.facebook.className,
      icon: BASE.facebook.icon,
      text: t("auth.login.actions.facebook"),
      onClick: () => {}, // wire when ready
      disabled: isBusy,
    });
  }
  if (providers.includes("microsoft")) {
    items.push({
      id: "microsoft",
      className: BASE.microsoft.className,
      icon: BASE.microsoft.icon,
      text: t("auth.login.actions.microsoft"),
      onClick: () => {}, // wire when ready
      disabled: isBusy,
    });
  }
  if (providers.includes("apple")) {
    items.push({
      id: "apple",
      className: BASE.apple.className,
      icon: BASE.apple.icon,
      text: t("auth.login.actions.apple"),
      onClick: () => {}, // wire when ready
      disabled: isBusy,
    });
  }

  return items;
}
