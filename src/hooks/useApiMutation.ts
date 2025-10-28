import { useCallback } from "react";
import type { AxiosRequestConfig, Method } from "axios";
import {
  useMutation,
  type MutationKey,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { apiRequest } from "../utils/api";

type ConfigFactory<TPayload> =
  | ((payload: TPayload) => AxiosRequestConfig)
  | AxiosRequestConfig
  | undefined;

interface UseApiMutationArgs<TResponse, TPayload, TContext>
  extends Omit<
    UseMutationOptions<TResponse, Error, TPayload, TContext>,
    "mutationFn" | "mutationKey"
  > {
  path?: string;
  method?: Method;
  mutationKey?: MutationKey;
  config?: ConfigFactory<TPayload>;
}

/**
 * Lightweight wrapper around `useMutation` that standardizes how we
 * build Axios requests across the app. The hook:
 *   1. Normalizes the URL based on the provided `path` or `config`.
 *   2. Automatically decides whether to send the payload via `params` (GET)
 *      or `data` (non-GET).
 *   3. Defers the actual request execution to `apiRequest` so global
 *      cross-cutting concerns (e.g. auth headers, logging) live in one place.
 *
 * When adding a new mutation hook:
 *   - Provide the path (relative or absolute) and the payload/response types.
 *   - Override the Axios config via the `config` prop if you need custom
 *     headers, query parameters, or a fully custom URL.
 *   - Call `mutateAsync(payload)` from your hook to execute the request.
 */
export const useApiMutation = <
  TResponse = unknown,
  TPayload extends Record<string, unknown> | FormData | void = Record<
    string,
    unknown
  >,
  TContext = unknown
>(
  {
    path,
    method = "POST",
    mutationKey,
    config,
    ...mutationOptions
  }: UseApiMutationArgs<TResponse, TPayload, TContext> = {}
): UseMutationResult<TResponse, Error, TPayload, TContext> => {
  if (!path && !config) {
    throw new Error("useApiMutation requires either a path or a config factory");
  }

  const mutationFn = useCallback(
    async (payload: TPayload) => {
      const overrides =
        typeof config === "function" ? config(payload) : config;
      const normalizedPath = path
        ? path.startsWith("/")
          ? path
          : `/${path}`
        : undefined;
      const requestUrl = overrides?.url ?? normalizedPath;

      if (!requestUrl) {
        throw new Error("useApiMutation requires a request url");
      }

      const methodUpper = method.toUpperCase();
      const requestConfig: AxiosRequestConfig = {
        url: requestUrl,
        method,
        ...(methodUpper === "GET"
          ? { params: payload }
          : { data: payload === null ? undefined : payload }),
        ...overrides,
      };

      return apiRequest<TResponse>(requestConfig);
    },
    [config, method, path]
  );

  return useMutation({
    mutationKey: mutationKey ?? ([method, path].filter(Boolean) as MutationKey),
    mutationFn,
    ...mutationOptions,
  });
};
