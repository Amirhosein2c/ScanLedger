import { useEffect } from 'react';

const isStandaloneMode = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
};

const usePwaSetup = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
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
