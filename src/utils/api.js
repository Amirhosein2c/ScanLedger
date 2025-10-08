const DEFAULT_API_BASE = 'https://api.perceptionist.top/webhook-test';

const resolveApiBase = () => {
  const configured = import.meta.env.VITE_API_BASE?.trim();
  if (configured) {
    return configured;
  }
  if (typeof window !== 'undefined') {
    const { location } = window;
    if (location && ['localhost', '127.0.0.1'].includes(location.hostname)) {
      return DEFAULT_API_BASE;
    }
  }
  return DEFAULT_API_BASE;
};

const API_BASE = resolveApiBase();
if (typeof window !== 'undefined') {
  window.API_BASE = API_BASE;
}
const runtime = typeof window !== 'undefined' ? window : globalThis;

/**
 * Execute a fetch request against the ScanLedger API with consistent defaults.
 */
export async function apiFetch(path, opts = {}) {
  if (!path) {
    throw new Error('Path is required for apiFetch');
  }

  const {
    method = 'POST',
    data,
    body,
    headers = {},
    expectJson = true,
    timeout = 30000
  } = opts;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${normalizedPath}`;

  const finalHeaders = { ...headers };
  let finalBody = body;

  if (data instanceof FormData) {
    finalBody = data;
  } else if (data && typeof data === 'object') {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(data);
  }

  const controller = new AbortController();
  const timeoutId = runtime.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: finalBody,
      signal: controller.signal
    });

    runtime.clearTimeout(timeoutId);

    let rawText = '';
    try {
      rawText = await response.text();
    } catch (error) {
      console.warn('Failed to read API response text', error);
    }

    let json;
    if (expectJson && rawText) {
      try {
        json = JSON.parse(rawText);
      } catch (error) {
        console.warn('Failed to parse API response JSON', error);
      }
    }

    if (!response.ok) {
      const message = json?.message || json?.error || `Request failed: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    return expectJson ? json ?? {} : rawText;
  } catch (error) {
    runtime.clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
}

export function apiPost(path, data, options = {}) {
  return apiFetch(path, { ...options, method: 'POST', data });
}

export function apiGet(path, options = {}) {
  return apiFetch(path, { ...options, method: 'GET' });
}
