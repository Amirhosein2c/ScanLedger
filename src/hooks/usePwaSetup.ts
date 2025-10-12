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

    return () => {
      window.removeEventListener('resize', setDocHeight);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.body.classList.remove('pwa-safe-area');
    };
  }, []);
};

export default usePwaSetup;
