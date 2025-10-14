'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { readStoredAuthSnapshot } from '../session';

interface AuthRedirectOptions {
  redirectAuthenticatedTo?: string;
  redirectUnauthenticatedTo?: string;
  enabled?: boolean;
}

const isBrowser = () => typeof window !== 'undefined';

export const useAuthRedirect = ({
  redirectAuthenticatedTo,
  redirectUnauthenticatedTo,
  enabled = true
}: AuthRedirectOptions) => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled || !isBrowser()) {
      return;
    }

    const { isAuthenticated } = readStoredAuthSnapshot();

    if (isAuthenticated && redirectAuthenticatedTo && pathname !== redirectAuthenticatedTo) {
      router.replace(redirectAuthenticatedTo);
      return;
    }

    if (!isAuthenticated && redirectUnauthenticatedTo && pathname !== redirectUnauthenticatedTo) {
      router.replace(redirectUnauthenticatedTo);
    }
  }, [
    enabled,
    pathname,
    redirectAuthenticatedTo,
    redirectUnauthenticatedTo,
    router
  ]);
};
