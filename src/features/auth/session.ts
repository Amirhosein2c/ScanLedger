import { getStoredProfile, type UserProfile } from "./profile";

export interface AuthSnapshot {
  profile: UserProfile;
  isAuthenticated: boolean;
}

const isBrowser = () => typeof window !== "undefined";

export const readStoredAuthSnapshot = (): AuthSnapshot => {
  const profile = getStoredProfile();

  // In a browser context localStorage may throw, getStoredProfile already guards.
  const isAuthenticated = Boolean(profile.email);

  return { profile, isAuthenticated };
};

export const clearStoredAuthSnapshot = (): void => {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem("user_email");
    window.localStorage.removeItem("user_name");
    window.localStorage.removeItem("user_surname");
    window.localStorage.removeItem("user_login_raw");
    window.localStorage.removeItem("auth_method");
    window.localStorage.removeItem("user_picture");
    window.localStorage.removeItem("user_id");
  } catch (error) {
    console.warn("Failed to clear stored auth snapshot", error);
  }
};
