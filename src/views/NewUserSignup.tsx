"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { useApiMutation } from "../hooks/useApiMutation";
import { SIGNUP_MUTATION_MOCK_RESPONSE } from "../mocks/mutations";
import {
  ensureGoogleOAuth,
  fetchGoogleProfile,
  GOOGLE_SCOPE,
} from "../utils/googleClient";
import { useAuthRedirect } from "../features/auth/hooks/useAuthRedirect";
import { useTranslation } from "@/src/lib/i18n";
import { buildSocialAuthButtons } from "@/src/features/auth/constants/socialAuth";
import {
  setStoredUserData,
  type StoredUserData,
} from "../features/auth/profile";

interface SignupForm {
  name: string;
  surname: string;
  email: string;
  password: string;
  confirmPassword: string;
  picture?: string;
}

const initialFormState: SignupForm = {
  name: "",
  surname: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const NewUserSignup = () => {
  const router = useRouter();
  const [form, setForm] = useState<SignupForm>(initialFormState);
  const [message, setMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { t } = useTranslation();
  useAuthRedirect({ redirectAuthenticatedTo: "/dashboard" });

  type SignupPayload = {
    name: string;
    surname: string;
    email: string;
    password: string;
    picture?: string;
    User_picture?: string | null;
    Latest_Documents?: Array<Record<string, string | null>> | null;
  };

  type SignupResponse = {
    // user_id: string;
    // Latest_Documents: ({ [key: string]: string } | {})[];
    User_email: string;
    User_ID: string;
    User_name: string;
    User_surname: string;
    User_picture?: string | null;
    documents?: Array<Record<string, string | null>> | null;
  };

  const signupMutation = useApiMutation<SignupResponse[], SignupPayload>({
    path: "/user_auth",
    mockResponse: SIGNUP_MUTATION_MOCK_RESPONSE as SignupResponse[],
  });
  const isSubmitting = signupMutation.isPending;
  const isLoading = signupMutation.isPending;
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const continueWithGoogle = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setMessage(t("auth.signup.errors.googleClientIdMissing"));
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

            const payload: SignupPayload = {
              email: `${profile.email}`,
              password: `${profile.sub}`,
              name: `${profile.given_name}`,
              surname: `${profile.family_name}`,
              picture: `${profile.picture}`,
            };
            await signupMutation.mutateAsync(payload).then((res) => {
              const [created] = res;
              if (created) {
                const userData: StoredUserData = {
                  User_email: created.User_email,
                  User_ID: created.User_ID,
                  User_name: created.User_name,
                  User_surname: created.User_surname,
                  User_picture: created.User_picture ?? null,
                  documents: created.documents ?? null,
                };
                setStoredUserData(userData);
              }

              handleSuccess();
            });
          } catch (callbackError) {
            console.error("Google signup callback failed", callbackError);
            setMessage(
              callbackError instanceof Error
                ? callbackError.message
                : t("auth.signup.errors.googleFailed")
            );
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (error) {
      console.error("Google signup start failed", error);
      setMessage(t("auth.signup.errors.googleStartFailed"));
      setIsGoogleLoading(false);
    }
  };

  const socialAuthBtns = buildSocialAuthButtons({
    t,
    isBusy: isLoading,
    isGoogleLoading,
    onGoogle: continueWithGoogle,
    providers: ["google"],
  });

  const handleSuccess = () => router.push("/dashboard");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (Object.values(form).some((value) => !value.trim())) {
      setMessage(t("auth.signup.errors.missingFields"));
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage(t("auth.signup.errors.passwordMismatch"));
      return;
    }

    try {
      const payload: SignupPayload = {
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        surname: form.surname.trim(),
        picture: form.picture || "",
      };

      await signupMutation.mutateAsync(payload).then((res) => {
        const [created] = res;
        if (created) {
          const userData: StoredUserData = {
            User_email: created.User_email,
            User_ID: created.User_ID,
            User_name: created.User_name,
            User_surname: created.User_surname,
            User_picture: created.User_picture ?? null,
            documents: created.documents ?? null,
          };
          setStoredUserData(userData);
        }
      });

      handleSuccess();
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      console.error("Signup webhook error", normalizedError);
      setMessage(normalizedError.message || t("errors.networkRetry"));
    }
  };

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
              {t("auth.signup.title")}
            </h1>
            <p className="mt-2 text-lg text-[var(--secondary-text-color)]">
              {t("auth.signup.subtitle")}
            </p>
          </div>

          {message && (
            <div className="mb-4 rounded-md border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {message}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="sr-only" htmlFor="signup_name">
                {t("auth.signup.fields.name.label")}
              </label>
              <input
                id="signup_name"
                name="name"
                type="text"
                autoComplete="given-name"
                required
                placeholder={t("auth.signup.fields.name.placeholder")}
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                value={form.name}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="signup_surname">
                {t("auth.signup.fields.surname.label")}
              </label>
              <input
                id="signup_surnamSignupResponsee"
                name="surname"
                type="text"
                autoComplete="family-name"
                required
                placeholder={t("auth.signup.fields.surname.placeholder")}
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                value={form.surname}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="signup_email">
                {t("auth.signup.fields.email.label")}
              </label>
              <input
                id="signup_email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder={t("auth.signup.fields.email.placeholder")}
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                value={form.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="signup_passwordUser_">
                {t("auth.signup.fields.password.label")}
              </label>
              <input
                id="signup_password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder={t("auth.signup.fields.password.placeholder")}
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                value={form.password}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="signup_confirm_password">
                {t("auth.signup.fields.confirmPassword.label")}
              </label>
              <input
                id="signup_confirm_password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder={t(
                  "auth.signup.fields.confirmPassword.placeholder"
                )}
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                value={form.confirmPassword}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-[var(--primary-color)] px-4 py-3 text-sm font-semibold leading-6 text-gray-900 shadow-sm transition-colors hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-color)]"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t("auth.signup.status.submitting")
                  : t("auth.signup.actions.signUp")}
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
          {t("auth.signup.prompt.haveAccount")}{" "}
          <button
            type="button"
            className="font-medium text-[var(--primary-color)] hover:text-opacity-80"
            onClick={() => router.push("/login")}
          >
            {t("auth.signup.actions.signIn")}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NewUserSignup;
