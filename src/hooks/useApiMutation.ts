import { useCallback } from 'react';
import type { AxiosRequestConfig, Method } from 'axios';
import { useMutation, type MutationKey, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';

type ConfigFactory<TPayload> = ((payload: TPayload) => AxiosRequestConfig) | AxiosRequestConfig | undefined;

interface UseApiMutationArgs<TResponse, TPayload, TContext>
  extends Omit<UseMutationOptions<TResponse, Error, TPayload, TContext>, 'mutationFn' | 'mutationKey'> {
  path?: string;
  method?: Method;
  mutationKey?: MutationKey;
  config?: ConfigFactory<TPayload>;
}

export const useApiMutation = <
  TResponse = unknown,
  TPayload extends Record<string, unknown> | FormData | void = Record<string, unknown>,
  TContext = unknown
>(
  {
    path,
    method = 'POST',
    mutationKey,
    config,
    ...mutationOptions
  }: UseApiMutationArgs<TResponse, TPayload, TContext> = {}
): UseMutationResult<TResponse, Error, TPayload, TContext> => {
  if (!path && !config) {
    throw new Error('useApiMutation requires either a path or a config factory');
  }

  const mutationFn = useCallback(
    async (payload: TPayload) => {
      const resolvedConfig = typeof config === 'function' ? config(payload) : config;
      const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : undefined;
      const overriddenUrl = resolvedConfig?.url ?? normalizedPath;

      if (!overriddenUrl) {
        throw new Error('useApiMutation requires a request url');
      }

      const requestConfig: AxiosRequestConfig = {
        url: overriddenUrl,
        method,
        ...(method.toUpperCase() === 'GET'
          ? { params: payload }
          : { data: payload === null ? undefined : payload }),
        ...resolvedConfig
      };

      return apiRequest<TResponse>(requestConfig);
    },
    [config, method, path]
  );

  return useMutation({
    mutationKey: mutationKey ?? ([method, path].filter(Boolean) as MutationKey),
    mutationFn,
    ...mutationOptions
  });
};
