// Centralized API base + helpers
(function () {
  const PROD_PROXY = '/webhook';              // via Netlify proxy (see _redirects)
  const PROD_DIRECT = 'https://api.perceptionist.top/webhook'; // optional direct usage locally
  const isLocal = ['localhost','127.0.0.1'].includes(location.hostname);

  // In production prefer same-origin proxy to avoid CORS & expose only one origin
  if (isLocal) {
    window.API_BASE = PROD_DIRECT; // local dev hits remote directly
  } else {
    window.API_BASE = PROD_PROXY;  // production through proxy
  }
})();

/**
 * Generic fetch (supports JSON or FormData)
 * opts: { method, data (object or FormData), body, headers, expectJson }
 */
async function apiFetch(path, opts = {}) {
  if (!window.API_BASE) throw new Error('API base not set');
  const {
    method = 'POST',
    data,
    body,
    headers = {},
    expectJson = true
  } = opts;

  const url = `${window.API_BASE}${path.startsWith('/') ? path : '/' + path}`;

  let finalBody = body;
  const finalHeaders = { ...headers };

  if (data instanceof FormData) {
    finalBody = data; // browser adds boundary automatically
  } else if (data && typeof data === 'object') {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(data);
  }

  const res = await fetch(url, { method, headers: finalHeaders, body: finalBody });
  let text = '';
  try { text = await res.text(); } catch (_) {}
  let json;
  if (expectJson) {
    try { json = text ? JSON.parse(text) : null; } catch (_) {}
  }

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return expectJson ? (json ?? {}) : text;
}

// Backwards compatibility helper (JSON POST)
async function apiPost(path, data) {
  return apiFetch(path, { method: 'POST', data, expectJson: true });
}

window.api = apiFetch;
window.apiPost = apiPost;
