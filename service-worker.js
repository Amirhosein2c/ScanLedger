/* Minimal service worker placeholder – offline caching deferred */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
