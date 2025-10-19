import * as React from "react";

export type ProviderKey = "google" | "facebook" | "microsoft" | "apple";

export type BuildSocialButtonsDeps = {
  /** i18n translator */
  t: (key: string) => string;
  /** global busy flag (e.g., login/signup in progress) */
  isBusy?: boolean;
  /** only Google shows a separate loading label */
  isGoogleLoading?: boolean;

  /** handlers */
  onGoogle: () => void | Promise<void>;

  /** which providers to include (default: only google) */
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

/** Base visual catalog (styles + icons) */
const BASE: Record<ProviderKey, Pick<SocialBtnItem, "className" | "icon">> = {
  google: {
    className:
      "flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-white py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60",
    icon: (
      <img
        src="https://www.gstatic.com/images/branding/product/1x/googleg_24dp.png"
        alt="Google"
        className="h-5 w-5"
      />
    ),
  },
  facebook: {
    className:
      "flex w-full items-center justify-center gap-3 rounded-md bg-[#1877f3] py-3 text-sm font-medium text-white transition-colors hover:bg-[#166fe0] disabled:cursor-not-allowed disabled:opacity-60",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="white"
        className="h-5 w-5"
      >
        <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0" />
      </svg>
    ),
  },
  microsoft: {
    className:
      "flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-[#111827] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60",
    icon: (
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
        alt="Microsoft"
        className="h-5 w-5"
      />
    ),
  },
  apple: {
    className:
      "flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-black py-3 text-sm font-medium text-white transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60",
    icon: (
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
        alt="Apple"
        className="h-5 w-5"
        style={{ filter: "invert(1)" }}
      />
    ),
  },
};

/** Build the array you’ll map over in JSX */
export function buildSocialAuthButtons({
  t,
  isBusy = false,
  isGoogleLoading = false,
  onGoogle,
  providers = ["google"], // default to google only for now
}: //TODO: add other providers' onClick handlers
BuildSocialButtonsDeps): SocialBtnItem[] {
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
      onClick: () => {},
      disabled: isBusy,
    });
  }
  if (providers.includes("microsoft")) {
    items.push({
      id: "microsoft",
      className: BASE.microsoft.className,
      icon: BASE.microsoft.icon,
      text: t("auth.login.actions.microsoft"),
      onClick: () => {},
      disabled: isBusy,
    });
  }
  if (providers.includes("apple")) {
    items.push({
      id: "apple",
      className: BASE.apple.className,
      icon: BASE.apple.icon,
      text: t("auth.login.actions.apple"),
      onClick: () => {},
      disabled: isBusy,
    });
  }

  return items;
}
