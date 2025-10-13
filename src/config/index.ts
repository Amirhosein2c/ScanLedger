const env = (key: string) => process.env[key]?.trim();
const isBrowser = typeof window !== "undefined";
// const isProd = process.env.NODE_ENV === "production";

// const resolveGoogleClientId = (): string => {
//   const configuredId = env("NEXT_PUBLIC_GOOGLE_CLIENT_ID");

//   if (configuredId) {
//     return configuredId;
//   }

//   if (isProd) {
//     throw new Error(
//       "NEXT_PUBLIC_GOOGLE_CLIENT_ID must be defined in production for Google OAuth."
//     );
//   }

//   const message =
//     "Using fallback Google Client ID. Define NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment.";
//   if (isBrowser) {
//     console.warn(message);
//   } else {
//     // eslint-disable-next-line no-console
//     console.warn(message);
//   }

//   return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string;
// };

export const GOOGLE_CLIENT_ID = process.env
  .NEXT_PUBLIC_GOOGLE_CLIENT_ID as string;

export const GOOGLE_SCOPES =
  env("NEXT_PUBLIC_GOOGLE_SCOPES") || "email profile openid";

export const API_TIMEOUT = Number.parseInt(
  env("NEXT_PUBLIC_API_TIMEOUT") ?? "30000",
  10
);

const DEFAULT_DEV_REDIRECT = "http://localhost:3000";

export const isDevelopment = (): boolean => {
  if (isBrowser) {
    return ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
  }
  return process.env.NODE_ENV !== "production";
};

export const getRedirectUri = (): string => {
  if (isBrowser) {
    return window.location.origin;
  }
  if (isDevelopment()) {
    return env("NEXT_PUBLIC_DEV_REDIRECT_URI") || DEFAULT_DEV_REDIRECT;
  }
  return env("NEXT_PUBLIC_APP_URL") || "";
};
