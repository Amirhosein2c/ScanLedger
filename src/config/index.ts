const env = (key: string) => process.env[key]?.trim();
const isBrowser = typeof window !== "undefined";
// const isProd = process.env.NODE_ENV === "production";

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
