import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type Method,
} from "axios";
import { API_TIMEOUT } from "../config";

const isBrowser = typeof window !== "undefined";

const normalizeBaseUrl = (value: string | undefined | null): string => {
  if (!value) {
    return "/api";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "/api";
  }
  const withoutTrailing = trimmed.replace(/\/+$/, "");

  if (
    withoutTrailing.startsWith("http://") ||
    withoutTrailing.startsWith("https://") ||
    withoutTrailing.startsWith("/")
  ) {
    return withoutTrailing;
  }

  return `/${withoutTrailing}`;
};

const PUBLIC_API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL
);
const SERVER_API_BASE_URL = normalizeBaseUrl(
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
);
const API_BASE_URL = isBrowser ? PUBLIC_API_BASE_URL : SERVER_API_BASE_URL;
const REQUEST_TIMEOUT = Number.isFinite(API_TIMEOUT) ? API_TIMEOUT : 30000;

interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    Accept: "application/json",
  },
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers?.["Content-Type"];
    return config;
  }

  const isJsonPayload =
    config.data &&
    typeof config.data === "object" &&
    !Array.isArray(config.data) &&
    !(config.data instanceof Blob);

  if (isJsonPayload && !config.headers?.["Content-Type"]) {
    config.headers = config.headers || {};
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError) => {
    if (axios.isCancel(error)) {
      return Promise.reject(new Error("Request was cancelled"));
    }

    if (
      error.code === "ECONNABORTED" ||
      error.message?.toLowerCase().includes("timeout")
    ) {
      return Promise.reject(
        new Error("Request timeout - please check your connection")
      );
    }

    if (error.response) {
      const { status, statusText, data } = error.response;
      const message =
        (data as Record<string, unknown>)?.message ||
        (data as Record<string, unknown>)?.error;
      const normalizedError: ApiError = new Error(
        message ? String(message) : `Request failed: ${status} ${statusText}`
      );
      normalizedError.status = status;
      normalizedError.data = data;
      return Promise.reject(normalizedError);
    }

    if (error.request) {
      return Promise.reject(
        new Error("Network error - unable to reach the server")
      );
    }

    return Promise.reject(error);
  }
);

export const apiRequest = async <T = unknown>(
  config: AxiosRequestConfig
): Promise<T> => {
  if (!config?.url) {
    throw new Error("Request configuration requires a url");
  }

  const data = await apiClient.request<T>(config);
  return data as T;
};

export const apiGet = <T = unknown>(
  path: string,
  config: AxiosRequestConfig = {}
): Promise<T> => apiClient.get<T>(path, config) as unknown as Promise<T>;

export const apiPost = <T = unknown, TData = unknown>(
  path: string,
  data?: TData,
  config: AxiosRequestConfig = {}
): Promise<T> => apiClient.post<T>(path, data, config) as unknown as Promise<T>;

export const apiPut = <T = unknown, TData = unknown>(
  path: string,
  data?: TData,
  config: AxiosRequestConfig = {}
): Promise<T> => apiClient.put<T>(path, data, config) as unknown as Promise<T>;

export const apiPatch = <T = unknown, TData = unknown>(
  path: string,
  data?: TData,
  config: AxiosRequestConfig = {}
): Promise<T> =>
  apiClient.patch<T>(path, data, config) as unknown as Promise<T>;

export const apiDelete = <T = unknown>(
  path: string,
  config: AxiosRequestConfig = {}
): Promise<T> => apiClient.delete<T>(path, config) as unknown as Promise<T>;

export type { Method as HttpMethod };
export { API_BASE_URL, apiClient };
