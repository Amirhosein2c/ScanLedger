import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type Method
} from 'axios';
import { API_TIMEOUT } from '../config';

// const DEFAULT_API_BASE = 'https://api.perceptionist.top/webhook-test';
const DEFAULT_API_BASE = 'https://api.perceptionist.top/webhook';
const DEFAULT_TIMEOUT = API_TIMEOUT || 30000;
const runtime = typeof globalThis !== 'undefined' ? globalThis : undefined;

const resolveApiBase = (): string => {
  const configured = import.meta.env.VITE_API_BASE?.trim();
  if (configured) {
    return configured;
  }
  const hostname = runtime?.location?.hostname;
  if (hostname && ['localhost', '127.0.0.1'].includes(hostname)) {
    return DEFAULT_API_BASE;
  }
  return DEFAULT_API_BASE;
};

const API_BASE = resolveApiBase();

interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    Accept: 'application/json'
  },
  withCredentials: false
});

apiClient.interceptors.request.use(
  (config) => {
    const nextConfig: AxiosRequestConfig = { ...config };
    nextConfig.headers = { ...(config.headers ?? {}) };

    if (nextConfig.data instanceof FormData) {
      delete nextConfig.headers['Content-Type'];
    } else if (
      nextConfig.data &&
      typeof nextConfig.data === 'object' &&
      !Array.isArray(nextConfig.data) &&
      !nextConfig.headers['Content-Type']
    ) {
      nextConfig.headers['Content-Type'] = 'application/json';
    }

    return nextConfig;
  },
  (requestError: AxiosError) => Promise.reject(requestError)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError) => {
    if (axios.isCancel(error)) {
      return Promise.reject(new Error('Request was cancelled'));
    }

    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return Promise.reject(new Error('Request timeout - please check your connection'));
    }

    if (error.response) {
      const { status, statusText, data } = error.response;
      const message = (data as Record<string, unknown>)?.message || (data as Record<string, unknown>)?.error;
      const normalizedError: ApiError = new Error(message ? String(message) : `Request failed: ${status} ${statusText}`);
      normalizedError.status = status;
      normalizedError.data = data;
      return Promise.reject(normalizedError);
    }

    if (error.request) {
      return Promise.reject(new Error('Network error - unable to reach the server'));
    }

    return Promise.reject(error);
  }
);

export const apiRequest = <T = unknown>(config: AxiosRequestConfig): Promise<T> => {
  if (!config?.url) {
    throw new Error('Request configuration requires a url');
  }
  return apiClient.request<T>(config);
};

export const apiGet = <T = unknown>(path: string, config: AxiosRequestConfig = {}): Promise<T> =>
  apiClient.get<T>(path, config);

export const apiPost = <T = unknown, TData = unknown>(
  path: string,
  data?: TData,
  config: AxiosRequestConfig = {}
): Promise<T> => apiClient.post<T>(path, data, config);

export const apiPut = <T = unknown, TData = unknown>(
  path: string,
  data?: TData,
  config: AxiosRequestConfig = {}
): Promise<T> => apiClient.put<T>(path, data, config);

export const apiPatch = <T = unknown, TData = unknown>(
  path: string,
  data?: TData,
  config: AxiosRequestConfig = {}
): Promise<T> => apiClient.patch<T>(path, data, config);

export const apiDelete = <T = unknown>(path: string, config: AxiosRequestConfig = {}): Promise<T> =>
  apiClient.delete<T>(path, config);

export type { Method as HttpMethod };
export { API_BASE, apiClient };
