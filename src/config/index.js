const FALLBACK_GOOGLE_CLIENT_ID = '50199771016-rn343kmat6jib4f07dsfj3mh3iu12cfm.apps.googleusercontent.com';

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || FALLBACK_GOOGLE_CLIENT_ID;

export const GOOGLE_SCOPES = import.meta.env.VITE_GOOGLE_SCOPES || 'email profile openid';

export const API_TIMEOUT = Number.parseInt(import.meta.env.VITE_API_TIMEOUT ?? '30000', 10);

export const isDevelopment = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
};

export const getRedirectUri = () => {
  if (isDevelopment()) {
    return import.meta.env.VITE_DEV_REDIRECT_URI || 'http://localhost:5173';
  }
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.origin;
};
