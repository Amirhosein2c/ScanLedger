import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type Method,
} from "axios";
import { API_TIMEOUT } from "../config";

const ensureLeadingSlash = (value: string) =>
  value.startsWith("/") ? value : `/${value}`;
const stripTrailingSlash = (value: string) => value.replace(/\/$/, "");

const PUBLIC_GATEWAY_PATH = ensureLeadingSlash(
  process.env.NEXT_PUBLIC_API_PATH?.trim() || "/api"
);
const INTERNAL_GATEWAY_ORIGIN = process.env.API_GATEWAY_INTERNAL_ORIGIN?.trim();
const PUBLIC_APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL?.trim();
const VERCEL_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;
const DEFAULT_SERVER_ORIGIN = VERCEL_ORIGIN ?? "http://localhost:3000";

const resolveGatewayBase = (): string => {
  if (typeof window !== "undefined") {
    return PUBLIC_GATEWAY_PATH;
  }

  const origin =
    INTERNAL_GATEWAY_ORIGIN ||
    PUBLIC_APP_ORIGIN ||
    VERCEL_ORIGIN ||
    DEFAULT_SERVER_ORIGIN;
  if (origin) {
    return `${stripTrailingSlash(origin)}${PUBLIC_GATEWAY_PATH}`;
  }

  return PUBLIC_GATEWAY_PATH;
};

const API_BASE = resolveGatewayBase();
const DEFAULT_TIMEOUT = Number.isFinite(API_TIMEOUT) ? API_TIMEOUT : 30000;

interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    Accept: "application/json",
  },
  withCredentials: false,
});

apiClient.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (
      config.data &&
      typeof config.data === "object" &&
      !Array.isArray(config.data) &&
      !config.headers?.["Content-Type"]
    ) {
      config.headers = config.headers || {};
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

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
export { API_BASE, apiClient };
