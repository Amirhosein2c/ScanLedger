import { useCallback } from "react";
import type { AxiosRequestConfig, Method } from "axios";
import {
  useMutation,
  type MutationKey,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { apiRequest } from "../utils/api";

// configFactory lets each caller describe how to build request overrides for its payload.
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
  mockResponse?: TResponse;
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
    mockResponse,
    ...mutationOptions
  }: UseApiMutationArgs<TResponse, TPayload, TContext> = {}
): UseMutationResult<TResponse, Error, TPayload, TContext> => {
  if (!path && !config) {
    throw new Error("useApiMutation requires either a path or a config factory");
  }

  // mutationFn encapsulates the request-building logic so every hook reuses the same flow.
  const mutationFn = useCallback(
    async (payload: TPayload) => {
      // overrides represent the optional Axios configuration supplied by the hook author.
      const overrides =
        typeof config === "function" ? config(payload) : config;
      // normalizedPath guarantees relative paths become absolute when forwarding to Axios.
      const normalizedPath = path
        ? path.startsWith("/")
          ? path
          : `/${path}`
        : undefined;
      // requestUrl is the final endpoint we pass to Axios (overrides.url wins over path).
      const requestUrl = overrides?.url ?? normalizedPath;

      if (!requestUrl) {
        throw new Error("useApiMutation requires a request url");
      }

      // methodUpper is cached to avoid multiple string allocations in the ternary below.
      const methodUpper = method.toUpperCase();
      // requestConfig is the complete Axios config ultimately handed to apiRequest.
      const requestConfig: AxiosRequestConfig = {
        url: requestUrl,
        method,
        ...(methodUpper === "GET"
          ? { params: payload }
          : { data: payload === null ? undefined : payload }),
        ...overrides,
      };

      const response = await apiRequest<TResponse>(requestConfig);

      const isEmptyResponse =
        response == null ||
        (typeof response === "string" && response.trim().length === 0);

      if (isEmptyResponse && mockResponse !== undefined) {
        return mockResponse;
      }

      return response;
    },
    [config, method, mockResponse, path]
  );

  return useMutation({
    mutationKey: mutationKey ?? ([method, path].filter(Boolean) as MutationKey),
    mutationFn,
    ...mutationOptions,
  });
};
