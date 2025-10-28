"use client";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// import "../styles/loginRegistration.css";
import { useLogin } from "../features/auth/hooks/useLogin";
import {
  ensureGoogleOAuth,
  fetchGoogleProfile,
  GOOGLE_SCOPE,
} from "../utils/googleClient";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";
import { buildSocialAuthButtons } from "@/src/features/auth/constants/socialAuth";

const LoginRegistration = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { t } = useTranslation();

  useAuthRedirect({ redirectAuthenticatedTo: "/dashboard" });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedEmail = window.localStorage?.getItem("user_email");
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const { login, isLoading } = useLogin({
    onSuccess: () => {
      setMessage(null);
      router.push("/dashboard");
    },
    onError: (error) => {
      setMessage(error.message || t("errors.networkRetry"));
    },
  });

  const socialAuthBtns = buildSocialAuthButtons({
    t,
    isBusy: isLoading,
    isGoogleLoading,
    onGoogle: continueWithGoogle,
    providers: ["google"],
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setMessage(t("auth.login.errors.missingCredentials"));
      return;
    }

    try {
      await login({ email: trimmedEmail, password });
    } catch (error) {
      console.error("Login webhook error", error);
    }
  };

  async function continueWithGoogle() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setMessage(t("auth.login.errors.googleClientIdMissing"));
      return;
    }

    if (typeof window === "undefined") {
      setMessage(t("errors.browserOnly"));
      return;
    }

    try {
      setMessage(null);
      setIsGoogleLoading(true);
      await ensureGoogleOAuth();

      const google = window.google;
      if (!google?.accounts?.oauth2) {
        throw new Error(t("errors.googleClientUnavailable"));
      }

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: `${GOOGLE_SCOPE}`,
        prompt: "select_account",
        callback: async (tokenResponse) => {
          try {
            const accessToken = tokenResponse?.access_token;
            if (!accessToken) {
              throw new Error(
                tokenResponse?.error || t("errors.googleNoAccessToken")
              );
            }

            const profile = await fetchGoogleProfile(accessToken);

            if (profile.email && typeof window !== "undefined") {
              window.localStorage.setItem(
                "user_email",
                profile.email.toLowerCase()
              );
              if (profile.given_name) {
                window.localStorage.setItem("user_name", profile.given_name);
              }
              if (profile.family_name) {
                window.localStorage.setItem(
                  "user_surname",
                  profile.family_name
                );
              }
              if (profile.picture) {
                window.localStorage.setItem("user_picture", profile.picture);
              }
            }

            const payload: { [key: string]: string } = {
              email: profile.email || "",
              password: profile.sub as string,
              name: profile.given_name || "",
              surname: profile.family_name || "",
              picture: profile.picture || "",
            };
            await login({
              email: payload.email,
              password: `${payload.password}`,
            });
          } catch (callbackError) {
            console.error("Google sign-in callback failed", callbackError);
            setMessage(
              callbackError instanceof Error
                ? callbackError.message
                : t("auth.login.errors.googleSignInFailed")
            );
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (error) {
      console.error("Google sign-in start failed", error);
      setMessage(t("auth.login.errors.googleSignInStartFailed"));
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background-color)] text-[var(--text-color)]">
      <main className="flex flex-grow flex-col justify-center px-6 sm:px-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-12 text-center">
            <svg
              className="mx-auto mb-4 h-16 w-16 text-[var(--primary-color)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <h1 className="text-4xl font-bold tracking-tighter">
              {t("common.appName")}
            </h1>
            <p className="mt-2 text-lg text-[var(--secondary-text-color)]">
              {t("auth.login.subtitle")}
            </p>
          </div>

          {message && (
            <div className="mb-4 rounded-md border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {message}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="sr-only" htmlFor="email">
                {t("auth.login.fields.emailOrUsername.label")}
              </label>
              <input
                autoComplete="email"
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                id="email"
                name="email"
                placeholder={t("auth.login.fields.emailOrUsername.placeholder")}
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">
                {t("auth.login.fields.password.label")}
              </label>
              <input
                autoComplete="current-password"
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                id="password"
                name="password"
                placeholder={t("auth.login.fields.password.placeholder")}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-end">
              <a
                className="text-sm font-medium text-[var(--primary-color)] hover:text-opacity-80"
                href="#"
              >
                {t("auth.login.actions.forgotPassword")}
              </a>
            </div>
            <div>
              <button
                className="flex w-full justify-center rounded-md bg-[var(--primary-color)] px-4 py-3 text-sm font-semibold leading-6 text-gray-900 shadow-sm transition-colors hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-color)]"
                type="submit"
                disabled={isLoading}
              >
                {isLoading
                  ? t("auth.login.status.signingIn")
                  : t("auth.login.actions.signIn")}
              </button>
            </div>
          </form>

          <div aria-hidden="true" className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[var(--background-color)] px-3 text-[var(--secondary-text-color)]">
                  {t("auth.shared.orContinueWith")}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-3">
            {socialAuthBtns.map((p) => (
              <button
                key={p.id}
                type="button"
                className={p.className}
                onClick={p.onClick}
                disabled={p.disabled}
              >
                {p.icon}
                <span>{p.text}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 sm:px-8">
        <div className="text-center text-sm text-[var(--secondary-text-color)]">
          {t("auth.login.prompt.noAccount")}{" "}
          <button
            type="button"
            className="font-medium text-[var(--primary-color)] hover:text-opacity-80"
            onClick={() => router.push("/signup")}
          >
            {t("auth.login.actions.signUpLink")}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LoginRegistration;
