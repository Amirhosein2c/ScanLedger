import { useCallback } from "react";
import { useApiMutation } from "../../../hooks/useApiMutation";
import {
  extractUserProfile,
  getStoredProfile,
  mergeProfile,
  persistLoginPayload,
  persistUserProfile,
  type UserProfile,
} from "../profile";

interface LoginCredentials {
  email: string;
  password?: string;
}

interface LoginSuccessPayload<TResponse> {
  profile: UserProfile;
  response: TResponse;
  credentials: {
    email: string;
    password?: string;
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

export const useLogin = <TResponse = unknown>({
  onSuccess,
  onError,
}: UseLoginArgs<TResponse> = {}): UseLoginResult<TResponse> => {
  const loginMutation = useApiMutation<TResponse, { email: string }>({
    path: "/user_login",
  });

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      const trimmedEmail = email?.trim();
      if (!trimmedEmail) {
        throw new Error("Email is required");
      }

      try {
        const response = await loginMutation.mutateAsync({
          email: trimmedEmail,
        });

        persistLoginPayload(response);

        const storedProfile = getStoredProfile();
        const extractedProfile = extractUserProfile(response);
        const profile = mergeProfile({
          extracted: extractedProfile,
          fallbackEmail: trimmedEmail,
          stored: storedProfile,
        });

        persistUserProfile(profile);

        onSuccess?.({
          profile,
          response,
          credentials: { email: trimmedEmail, password },
        });

        return { response, profile };
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error(String(error));
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
