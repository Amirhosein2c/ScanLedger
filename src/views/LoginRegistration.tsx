"use client";
/* eslint-disable @next/next/no-img-element */
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

const LoginRegistration = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
      setMessage(error.message || "Network error. Please retry.");
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setMessage("Please fill in both Email/Username and Password.");
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
      setMessage("Google login is not configured. Missing client ID.");
      return;
    }

    if (typeof window === "undefined") {
      setMessage("Running outside the browser.");
      return;
    }

    try {
      setMessage(null);
      setIsGoogleLoading(true);
      await ensureGoogleOAuth();

      const google = window.google;
      if (!google?.accounts?.oauth2) {
        throw new Error("Google OAuth client is unavailable.");
      }

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPE,
        prompt: "select_account",
        callback: async (tokenResponse) => {
          try {
            const accessToken = tokenResponse?.access_token;
            if (!accessToken) {
              throw new Error(
                tokenResponse?.error || "No access token received from Google."
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
            }

            router.push("/dashboard");
          } catch (callbackError) {
            console.error("Google sign-in callback failed", callbackError);
            setMessage(
              callbackError instanceof Error
                ? callbackError.message
                : "Google sign-in failed."
            );
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (error) {
      console.error("Google sign-in start failed", error);
      setMessage("Google sign-in could not start. Please try again.");
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
            <h1 className="text-4xl font-bold tracking-tighter">ScanLedger</h1>
            <p className="mt-2 text-lg text-[var(--secondary-text-color)]">
              Securely access your account
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
                Email or Username
              </label>
              <input
                autoComplete="email"
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                id="email"
                name="email"
                placeholder="Email or Username"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">
                Password
              </label>
              <input
                autoComplete="current-password"
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                id="password"
                name="password"
                placeholder="Password"
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
                Forgot your password?
              </a>
            </div>
            <div>
              <button
                className="flex w-full justify-center rounded-md bg-[var(--primary-color)] px-4 py-3 text-sm font-semibold leading-6 text-gray-900 shadow-sm transition-colors hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-color)]"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
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
                  Or continue with
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-white py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={continueWithGoogle}
              disabled={isGoogleLoading || isLoading}
            >
              <img
                src="https://www.gstatic.com/images/branding/product/1x/googleg_24dp.png"
                alt="Google"
                className="h-5 w-5"
              />
              <span>
                {isGoogleLoading
                  ? "Connecting to Google..."
                  : "Login with Google"}
              </span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-md bg-[#1877f3] py-3 text-sm font-medium text-white transition-colors hover:bg-[#166fe0]"
              onClick={() =>
                setMessage(
                  "Facebook Sign-In is not configured yet. Please use email/password to sign in."
                )
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="h-5 w-5"
              >
                <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0" />
              </svg>
              <span>Login with Facebook</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-[#111827] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1f2937]"
              onClick={() =>
                setMessage(
                  "Microsoft Sign-In is not configured yet. Please use email/password to sign in."
                )
              }
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                alt="Microsoft"
                className="h-5 w-5"
              />
              <span>Login with Microsoft</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-black py-3 text-sm font-medium text-white transition-colors hover:bg-gray-900"
              onClick={() =>
                setMessage(
                  "Apple Sign-In is not configured yet. Please use email/password to sign in."
                )
              }
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
                alt="Apple"
                className="h-5 w-5"
                style={{ filter: "invert(1)" }}
              />
              <span>Login with Apple</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 sm:px-8">
        <div className="text-center text-sm text-[var(--secondary-text-color)]">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="font-medium text-[var(--primary-color)] hover:text-opacity-80"
            onClick={() => router.push("/signup")}
          >
            Sign Up
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LoginRegistration;
