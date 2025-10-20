import { translate } from "../lib/i18n";

const GOOGLE_SCRIPT_SRC = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_SRC;
const GOOGLE_USERINFO_URL = process.env.NEXT_PUBLIC_GOOGLE_USERINFO_URL;

let scriptLoadingPromise: Promise<void> | null = null;

const isBrowser = () =>
  typeof window !== "undefined" && typeof document !== "undefined";

export const GOOGLE_SCOPE = process.env.NEXT_PUBLIC_GOOGLE_SCOPES;

export interface GoogleProfile {
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  [key: string]: unknown;
}

export const ensureGoogleOAuth = async (): Promise<void> => {
  if (!isBrowser()) {
    throw new Error(translate("errors.googleBrowserOnly"));
  }

  if (window.google?.accounts?.oauth2) {
    return;
  }

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        "script[data-google-client]"
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error(translate("errors.googleScriptLoad"))),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.googleClient = "true";

      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error(translate("errors.googleScriptLoad")));

      document.head.appendChild(script);
    });
  }

  await scriptLoadingPromise;

  if (!window.google?.accounts?.oauth2) {
    scriptLoadingPromise = null;
    throw new Error(translate("errors.googleClientInit"));
  }
};

export const fetchGoogleProfile = async (
  accessToken: string
): Promise<GoogleProfile> => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(translate("errors.googleProfileFetch"));
  }

  return (await response.json()) as GoogleProfile;
};

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

type GoogleOAuth2 = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (response: { access_token?: string; error?: string }) => void;
  }) => GoogleTokenClient;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2;
      };
    };
  }
}
