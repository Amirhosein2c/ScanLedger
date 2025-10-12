import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const WelcomeOnboarding = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installLabel, setInstallLabel] = useState('Install App');
  const [installDisabled, setInstallDisabled] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let fallbackTimer: number | undefined;

    const beforeInstallHandler = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setInstallLabel('Install App');
      setInstallDisabled(false);
      setShowInstall(true);
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
    };

    const installedHandler = () => {
      setDeferredPrompt(null);
      setShowInstall(false);
      setInstallDisabled(false);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallHandler);
    window.addEventListener('appinstalled', installedHandler);

    const navigatorStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    const alreadyStandalone = window.matchMedia?.('(display-mode: standalone)').matches || navigatorStandalone;

    if (!alreadyStandalone) {
      fallbackTimer = window.setTimeout(() => {
        setShowInstall(true);
        setInstallLabel('Install via Browser Menu');
        setInstallDisabled(true);
      }, 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
      window.removeEventListener('appinstalled', installedHandler);
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      // user dismissed prompt; no-op
    }
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  return (
    <main className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-[#111827] text-white">
      <div className="flex flex-col">
        <div className="relative h-80">
          <img
            alt="Financial documents and a phone"
            className="absolute inset-0 h-full w-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQNf2prOH6SDbyyQvcqRCtCGJYxlBX2p7koeYY-tOsVDlogAK8MlE1Dj9k9CL5Pu1Vcq2-1zPIbLYPAmTicu8USSQjIlo2P4fm1b5Mb9vvSl6G8OAJerZ7QHW6OOzYa9JIgMEto0ewXgCRIA-QYZSOSC63WQntCFrk9ZguPWLtsaDz7DejxE-vN-A5a5GMjYJHrKboeOY1WlxdWGevQqr0_KvT2KCIKDc6JSsRG9_KoiunQ_Pk29KAU6CkDJf69AOreG4qebsFDTQ"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent" />
        </div>
        <div className="-mt-16 z-10 flex flex-col items-center px-6 pb-6 text-center">
          <div className="mb-4">
            <svg fill="none" height="64" viewBox="0 0 64 64" width="64" xmlns="http://www.w3.org/2000/svg">
              <rect fill="#38E07B" height="64" rx="32" width="64" />
              <path
                d="M26 20H42C43.1046 20 44 20.8954 44 22V42C44 43.1046 43.1046 44 42 44H22C20.8954 44 20 43.1046 20 42V26L26 20Z"
                fill="#111827"
              />
              <path d="M26 20L20 26H24C25.1046 26 26 25.1046 26 24V20Z" fill="#38E07B" />
              <path d="M28 32H38" stroke="white" strokeLinecap="round" strokeWidth="2" />
              <path d="M28 38H34" stroke="white" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to ScanLedger</h1>
          <p className="mt-2 max-w-sm text-base text-gray-300">
            Scan, digitize, and organize your financial documents effortlessly.
          </p>
        </div>
        <div className="flex flex-col gap-4 px-6 pb-12">
          <button
            type="button"
            className="flex h-14 w-full items-center justify-center rounded-full bg-[var(--primary-color)] text-lg font-bold text-[#111827] transition-transform active:scale-95"
            onClick={() => navigate('/signup')}
          >
            Get Started
          </button>
          <button
            type="button"
            className="flex h-14 w-full items-center justify-center rounded-full bg-[#1F2937] text-lg font-bold text-white transition-transform active:scale-95"
            onClick={() => navigate('/login')}
          >
            Log In
          </button>
          {showInstall && (
            <button
              type="button"
              className={`flex h-14 w-full items-center justify-center rounded-full border border-[var(--primary-color)] text-lg font-bold text-[var(--primary-color)] transition-transform ${
                installDisabled
                  ? 'cursor-not-allowed opacity-70'
                  : 'hover:bg-[var(--primary-color)] hover:text-[#111827] active:scale-95'
              }`}
              onClick={handleInstallClick}
              disabled={installDisabled}
            >
              {installLabel}
            </button>
          )}
        </div>
      </div>
    </main>
  );
};

export default WelcomeOnboarding;
