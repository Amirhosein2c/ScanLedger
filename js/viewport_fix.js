// Dynamic viewport height & safe-area handling
(function(){
  function setVh(){
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.height = '100%';
    document.body.style.minHeight = `calc(${vh}px * 100)`;
  }
  window.addEventListener('resize', setVh, {passive:true});
  window.addEventListener('orientationchange', () => setTimeout(setVh, 120), {passive:true});
  document.addEventListener('DOMContentLoaded', setVh);
  setVh();
  // iOS standalone safe-area padding & remove scroll bounce whitespace
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    document.documentElement.classList.add('pwa-standalone');
    document.body.classList.add('pwa-safe-area');
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.backgroundColor = '#111827';
  }
})();
