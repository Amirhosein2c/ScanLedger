import { useCallback } from "react";
import { useApiMutation } from "../../../hooks/useApiMutation";
import { LOGIN_MUTATION_MOCK_RESPONSE } from "../../../mocks/mutations";
import {
  mapUserToProfile,
  setStoredUserData,
  type StoredUserData,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const fallbackUserData = (email: string): StoredUserData => ({
  User_Email: email,
  User_ID: "",
  User_Name: "",
  User_Surname: "",
  User_Picture: null,
  Latest_Documents: null,
});

const toStoredUserData = (
  payload: unknown,
  fallbackEmail: string
): StoredUserData => {
  const fromRecord = (record: Record<string, unknown>): StoredUserData => ({
    User_Email:
      typeof record.User_Email === "string" && record.User_Email
        ? record.User_Email
        : fallbackEmail,
    User_ID:
      typeof record.User_ID === "string" ? record.User_ID : "",
    User_Name:
      typeof record.User_Name === "string" ? record.User_Name : "",
    User_Surname:
      typeof record.User_Surname === "string" ? record.User_Surname : "",
    User_Picture:
      typeof record.User_Picture === "string" ? record.User_Picture : null,
    Latest_Documents: Array.isArray(record.Latest_Documents)
      ? (record.Latest_Documents as Array<Record<string, string | null>>)
      : null,
  });

  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (isRecord(item)) {
        const candidate = fromRecord(item);
        if (candidate.User_Email) {
          return candidate;
        }
      }
    }
  }

  if (isRecord(payload)) {
    return fromRecord(payload);
  }

  return fallbackUserData(fallbackEmail);
};

/**
 * Domain-specific wrapper over the shared mutation hook.
 * Responsibilities:
 *   - Trigger the login API.
 *   - Persist the simplified user payload inside localStorage.
 *   - Surface a typed `login` helper so components never interact with
 *     `mutateAsync` directly.
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

        const userData = toStoredUserData(response, trimmedEmail);
        setStoredUserData(userData);
        const profile = mapUserToProfile(userData);

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
