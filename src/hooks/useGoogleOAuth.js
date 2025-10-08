import { useCallback, useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '../config/index.js';
import { apiPost } from '../utils/api.js';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT payload', error);
    return {};
  }
};

const isValidClientId = (clientId) =>
  Boolean(clientId) && clientId.includes('.apps.googleusercontent.com');

export const useGoogleOAuth = ({ onSuccess, onError } = {}) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const credentialCallbackRef = useRef(() => {});

  useEffect(() => {
    credentialCallbackRef.current = async (response) => {
      try {
        const { credential } = response;
        if (!credential) {
          throw new Error('No credential received from Google');
        }

        const payload = decodeJwt(credential);

        if (!payload?.email) {
          throw new Error('Google response did not include an email address');
        }

        localStorage.setItem('user_email', payload.email || '');
        localStorage.setItem('user_name', payload.given_name || '');
        localStorage.setItem('user_surname', payload.family_name || '');
        localStorage.setItem('auth_method', 'google');

        try {
          await apiPost('/user_auth', {
            credential,
            email: payload.email,
            name: payload.given_name,
            surname: payload.family_name,
            auth_provider: 'google',
            scopes: GOOGLE_SCOPES
          });
        } catch (postError) {
          console.warn('Backend verification failed (continuing)', postError);
        }

        onSuccess?.({
          credential,
          email: payload.email,
          name: payload.given_name,
          surname: payload.family_name,
          payload
        });
      } catch (callbackError) {
        console.error('Google OAuth callback failure', callbackError);
        setError(callbackError);
        onError?.(callbackError);
      }
    };
  }, [onSuccess, onError]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (!isValidClientId(GOOGLE_CLIENT_ID)) {
      const invalidClientError = new Error('Missing or invalid Google Client ID');
      setError(invalidClientError);
      onError?.(invalidClientError);
      return undefined;
    }

    let isCancelled = false;

    const initializeGoogle = () => {
      if (isCancelled || !window.google?.accounts?.id) {
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => credentialCallbackRef.current(response),
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true
        });
        setIsReady(true);
      } catch (initializationError) {
        console.error('Failed to initialize Google OAuth', initializationError);
        setError(initializationError);
        onError?.(initializationError);
      }
    };

    const ensureGoogleScript = () => {
      const existingScript = document.querySelector('script[data-google-identity]');

      if (existingScript) {
        if (window.google?.accounts?.id) {
          initializeGoogle();
        } else {
          existingScript.addEventListener('load', initializeGoogle, { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'gsi';

      script.onload = () => initializeGoogle();
      script.onerror = () => {
        const loadError = new Error('Failed to load Google Identity Services script');
        setError(loadError);
        onError?.(loadError);
      };

      document.head.appendChild(script);
    };

    ensureGoogleScript();

    return () => {
      isCancelled = true;
    };
  }, [onError]);

  const triggerSignIn = useCallback(() => {
    if (!window.google?.accounts?.id) {
      const unavailableError = new Error('Google Sign-In is not ready yet');
      setError(unavailableError);
      onError?.(unavailableError);
      return;
    }

    window.google.accounts.id.prompt((notification) => {
      if (!notification) {
        return;
      }

      if (notification.isNotDisplayed()) {
        const reason = notification.getNotDisplayedReason();
        const err = new Error(`Google Sign-In could not be displayed (${reason})`);
        setError(err);
        onError?.(err);
      } else if (notification.isSkippedMoment()) {
        const err = new Error(`Google Sign-In was skipped (${notification.getSkippedReason()})`);
        setError(err);
        onError?.(err);
      } else if (notification.isDismissedMoment()) {
        const err = new Error(`Google Sign-In was dismissed (${notification.getDismissedReason()})`);
        setError(err);
        onError?.(err);
      }
    });
  }, [onError]);

  return {
    isReady,
    error,
    triggerSignIn
  };
};
