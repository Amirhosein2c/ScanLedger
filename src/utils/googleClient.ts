const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_USERINFO_URL =
  "https://www.googleapis.com/oauth2/v3/userinfo?alt=json";

let scriptLoadingPromise: Promise<void> | null = null;

const isBrowser = () =>
  typeof window !== "undefined" && typeof document !== "undefined";

export const GOOGLE_SCOPE =
  "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

export interface GoogleProfile {
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  [key: string]: unknown;
}

export const ensureGoogleOAuth = async (): Promise<void> => {
  if (!isBrowser()) {
    throw new Error("Google auth can only run in the browser.");
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
          () => reject(new Error("Failed to load Google auth script.")),
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
        reject(new Error("Failed to load Google auth script."));

      document.head.appendChild(script);
    });
  }

  await scriptLoadingPromise;

  if (!window.google?.accounts?.oauth2) {
    scriptLoadingPromise = null;
    throw new Error("Google auth client did not initialise.");
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
    throw new Error("Could not fetch Google profile.");
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
