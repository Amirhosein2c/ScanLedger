(function () {
  // ALWAYS use the proxy in production to avoid security issues
  const PROXY_PATH = '/webhook';
  
  // For local development only
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  
  // // Use HTTPS for your VPS endpoint if testing locally
  // if (isLocal) {
  //   // For local dev, you should still use HTTPS if possible
  //   window.API_BASE = 'https://api.perceptionist.top/webhook';
  //   // window.API_BASE = 'https://api.perceptionist.top/webhook-test';
  // } else {
  //   // Production ALWAYS uses proxy (same-origin, no CORS, no exposed IPs)
  //   window.API_BASE = PROXY_PATH;
  // }
  
  // if (isLocal) {
  //   window.API_BASE = 'https://api.perceptionist.top/webhook';
  // } else {
  //   // Use VPS endpoint in production too
  //   window.API_BASE = 'https://api.perceptionist.top/webhook';
  // }

  if (isLocal) {
    window.API_BASE = 'https://api.perceptionist.top/webhook-test';
  } else {
    // Use VPS endpoint in production too
    window.API_BASE = 'https://api.perceptionist.top/webhook-test';
  }

  console.log('API configured for:', isLocal ? 'local development' : 'production');
})();

/**
 * Generic fetch with proper error handling
 */
async function apiFetch(path, opts = {}) {
  if (!window.API_BASE) throw new Error('API base not set');
  
  const {
    method = 'POST',
    data,
    body,
    headers = {},
    expectJson = true,
    timeout = 30000 // 30s default timeout
  } = opts;

  const url = `${window.API_BASE}${path.startsWith('/') ? path : '/' + path}`;
  
  let finalBody = body;
  const finalHeaders = { ...headers };

  if (data instanceof FormData) {
    finalBody = data;
  } else if (data && typeof data === 'object') {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(data);
  }

  // Add timeout support
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { 
      method, 
      headers: finalHeaders, 
      body: finalBody,
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    let text = '';
    try { 
      text = await res.text(); 
    } catch (_) {}
    
    let json;
    if (expectJson && text) {
      try { 
        json = JSON.parse(text); 
      } catch (_) {}
    }

    if (!res.ok) {
      const msg = (json && (json.message || json.error)) || 
                  `Request failed: ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    
    return expectJson ? (json ?? {}) : text;
    
  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    throw err;
  }
}

// Backwards compatibility
async function apiPost(path, data) {
  return apiFetch(path, { method: 'POST', data, expectJson: true });
}

window.api = apiFetch;
window.apiPost = apiPost;