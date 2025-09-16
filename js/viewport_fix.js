// Dynamic viewport height & safe-area handling
(function(){
  function setVh(){
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', () => setTimeout(setVh, 100));
  setVh();
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    document.documentElement.classList.add('pwa-standalone');
    document.body.classList.add('pwa-safe-area');
  }
})();
