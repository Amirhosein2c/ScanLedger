import { useCallback, useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '../config';
import { useApiMutation } from './useApiMutation';
import { persistUserProfile } from '../features/auth/profile';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface JwtPayload {
  email?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GooglePromptNotification {
  isNotDisplayed(): boolean;
  getNotDisplayedReason(): string;
  isSkippedMoment(): boolean;
  getSkippedReason(): string;
  isDismissedMoment(): boolean;
  getDismissedReason(): string;
}

interface GoogleIdInitializeOptions {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  itp_support?: boolean;
}

interface GoogleAccountsId {
  initialize(options: GoogleIdInitializeOptions): void;
  prompt(callback: (notification: GooglePromptNotification) => void): void;
}

interface GoogleIdentityServices {
  accounts: {
    id: GoogleAccountsId;
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

const decodeJwt = (token: string): JwtPayload => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch (error) {
    console.error('Failed to decode JWT payload', error);
    return {};
  }
};

const isValidClientId = (clientId: string | undefined): clientId is string =>
  Boolean(clientId) && clientId.includes('.apps.googleusercontent.com');

interface UseGoogleOAuthParams {
  onSuccess?: (payload: {
    credential: string;
    email: string;
    name?: string;
    surname?: string;
    payload: JwtPayload;
  }) => void;
  onError?: (error: Error) => void;
}

interface UseGoogleOAuthResult {
  isReady: boolean;
  error: Error | null;
  triggerSignIn: () => void;
}

export const useGoogleOAuth = ({ onSuccess, onError }: UseGoogleOAuthParams = {}): UseGoogleOAuthResult => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const credentialCallbackRef = useRef<(response: GoogleCredentialResponse) => Promise<void> | void>(() => {});
  const { mutateAsync: verifyCredential } = useApiMutation({
    path: '/user_auth'
  });

  useEffect(() => {
    credentialCallbackRef.current = async (response: GoogleCredentialResponse) => {
      try {
        const { credential } = response;
        if (!credential) {
          throw new Error('No credential received from Google');
        }

        const payload = decodeJwt(credential);

        if (!payload?.email) {
          throw new Error('Google response did not include an email address');
        }

        persistUserProfile({
          email: payload.email,
          name: (payload.given_name as string | undefined) ?? '',
          surname: (payload.family_name as string | undefined) ?? ''
        });

        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('auth_method', 'google');
        }

        try {
          await verifyCredential({
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
          name: payload.given_name as string | undefined,
          surname: payload.family_name as string | undefined,
          payload
        });
      } catch (callbackError) {
        const normalizedError = callbackError instanceof Error ? callbackError : new Error(String(callbackError));
        console.error('Google OAuth callback failure', normalizedError);
        setError(normalizedError);
        onError?.(normalizedError);
      }
    };
  }, [onSuccess, onError, verifyCredential]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
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
        const normalizedError =
          initializationError instanceof Error ? initializationError : new Error(String(initializationError));
        console.error('Failed to initialize Google OAuth', normalizedError);
        setError(normalizedError);
        onError?.(normalizedError);
      }
    };

    const ensureGoogleScript = () => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity]');

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
