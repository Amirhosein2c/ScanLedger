import { useEffect } from 'react';

const isStandaloneMode = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const mediaQueryMatches = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const navigatorStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  return mediaQueryMatches || navigatorStandalone;
};

const usePwaSetup = (): void => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const setDocHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setDocHeight();
    window.addEventListener('resize', setDocHeight);

    if (isStandaloneMode()) {
      document.body.classList.add('pwa-safe-area');
    }

    const handleAppInstalled = () => {
      document.body.classList.add('pwa-safe-area');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    if ('serviceWorker' in window.navigator) {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        window.navigator.serviceWorker
          .register('/service-worker.js', { scope: '/' })
          .catch((error) => {
            console.warn('Service worker registration failed', error);
          });
      } else {
        window.navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
          .catch((error) => {
            console.warn('Failed to unregister service workers in development', error);
          });
      }
    }

    return () => {
      window.removeEventListener('resize', setDocHeight);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.body.classList.remove('pwa-safe-area');
    };
  }, []);
};

export default usePwaSetup;
