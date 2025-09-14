// Central API base (proxied via Netlify _redirects)
(function(){
  const PROD_BASE = '/webhook'; // Netlify proxy path
  const LOCAL_DIRECT = 'http://192.99.127.217:5678/webhook';
  // If running locally over http on a non-https host, use direct URL; otherwise use proxy.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.API_BASE = LOCAL_DIRECT;
  } else {
    window.API_BASE = PROD_BASE;
  }
})();

// Helper for POST JSON
async function apiPost(path, data) {
  const url = `${window.API_BASE}${path.startsWith('/') ? path : '/' + path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  });
  let bodyText = null; let json = null;
  try { bodyText = await res.text(); json = bodyText ? JSON.parse(bodyText) : null; } catch(_) {}
  if (!res.ok) {
    const msg = json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}
