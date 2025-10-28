import { useCallback } from "react";
import { useApiMutation } from "../../../hooks/useApiMutation";
import { LOGIN_MUTATION_MOCK_RESPONSE } from "../../../mocks/mutations";
import {
  extractUserId,
  extractUserProfile,
  getStoredProfile,
  mergeProfile,
  persistLoginPayload,
  persistUserId,
  persistUserProfile,
  type UserProfile,
} from "../profile";
import { translate } from "../../../lib/i18n";

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginSuccessPayload<TResponse> {
  profile: UserProfile;
  response: TResponse;
  credentials: {
    email: string;
  };
}

interface UseLoginArgs<TResponse> {
  onSuccess?: (payload: LoginSuccessPayload<TResponse>) => void;
  onError?: (error: Error) => void;
}

interface UseLoginResult<TResponse> {
  login: (
    credentials: LoginCredentials
  ) => Promise<{ response: TResponse; profile: UserProfile }>;
  isLoading: boolean;
  status: "idle" | "pending" | "success" | "error";
  error: Error | null;
}

const normalizeError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

/**
 * Domain-specific wrapper over the shared mutation hook.
 * Responsibilities:
 *   - Trigger the login API.
 *   - Persist the raw payload, derived profile, and extracted user id.
 *   - Surface a typed `login` helper so components never interact with
 *     `mutateAsync` directly.
 *
 * Adding a new authentication mutation should follow the same pattern:
 *  1. Instantiate `useApiMutation` with the endpoint path.
 *  2. Do domain-specific side-effects (storage, routing, etc.) in the try block.
 *  3. Normalize errors before rethrowing so consumers can rely on `Error`.
 */
export const useLogin = <TResponse = unknown>({
  onSuccess,
  onError,
}: UseLoginArgs<TResponse> = {}): UseLoginResult<TResponse> => {
  // loginMutation orchestrates the network call and exposes react-query state.
  const loginMutation = useApiMutation<
    TResponse,
    { email: string; password: string }
  >({
    path: "/user_login",
    mockResponse: LOGIN_MUTATION_MOCK_RESPONSE as TResponse,
  });

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      // trimmedEmail removes accidental whitespace while keeping the original value intact.
      const trimmedEmail = email?.trim();
      if (!trimmedEmail) {
        throw new Error(translate("auth.login.errors.emailRequired"));
      }

      try {
        // response contains whatever the API returns after a successful login.
        const response = await loginMutation.mutateAsync({
          email: trimmedEmail,
          password,
        });

        persistLoginPayload(response);
        persistUserId(extractUserId(response));

        // storedProfile reflects the last persisted profile values (if any).
        const storedProfile = getStoredProfile();
        // extractedProfile is derived from the raw response payload.
        const extractedProfile = extractUserProfile(response);
        // profile merges old and new data to ensure we keep the best available values.
        const profile = mergeProfile({
          extracted: extractedProfile,
          fallbackEmail: trimmedEmail,
          stored: storedProfile,
        });

        persistUserProfile(profile);

        onSuccess?.({
          profile,
          response,
          credentials: { email: trimmedEmail },
        });

        return { response, profile };
      } catch (error) {
        const normalizedError = normalizeError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    [loginMutation, onError, onSuccess]
  );

  return {
    login,
    isLoading: loginMutation.isPending,
    status: loginMutation.status,
    error: loginMutation.error ?? null,
  };
};
