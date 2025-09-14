// Register service worker & handle install prompt
(function(){
  if ('serviceWorker' in navigator) {
    // Relative path for flexibility if hosted under a sub-path
    navigator.serviceWorker.register('./service-worker.js').catch(err => {
      console.warn('SW registration failed', err);
    });
  }

  let deferredPrompt;
  const installBtn = document.getElementById('install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.classList.remove('hidden');
  });

  // Fallback: if no event after a short delay and not already installed, hint user
  const alreadyStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!alreadyStandalone) {
    setTimeout(() => {
      if (!deferredPrompt && installBtn && installBtn.classList.contains('hidden')) {
        installBtn.classList.remove('hidden');
        installBtn.textContent = 'Install via Browser Menu';
        installBtn.disabled = true; // purely informational
        installBtn.classList.add('opacity-70','cursor-not-allowed');
      }
    }, 4000);
  }

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch(_) {}
      deferredPrompt = null;
      installBtn.classList.add('hidden');
    });
  }

  // Hide button if already installed
  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.classList.add('hidden');
  });
})();
