import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'images/icons/icon-72x72.png',
        'images/icons/icon-128x128.png',
        'images/icons/icon-152x152.png',
        'images/icons/icon-384x384.png',
        'images/icons/icon-512x512.png',
        'offline.html'
      ],
      devOptions: {
        enabled: true
      },
      workbox: {
        navigateFallback: '/index.html'
      },
      manifest: {
        name: 'ScanLedger - Financial Document Scanner',
        short_name: 'ScanLedger',
        id: 'scanledger',
        description: 'Scan, digitize, and organize financial documents. Offline-ready OCR and document management.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        background_color: '#111827',
        theme_color: '#38e07b',
        orientation: 'portrait-primary',
        categories: ['productivity', 'finance'],
        icons: [
          { src: 'images/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: 'images/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'images/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: 'images/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: 'images/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'images/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        shortcuts: [
          {
            name: 'Scan Document',
            short_name: 'Scan',
            url: '/documents/scan',
            icons: [{ src: 'images/icons/icon-128x128.png', sizes: '128x128' }]
          },
          {
            name: 'Search Documents',
            short_name: 'Search',
            url: '/documents/search',
            icons: [{ src: 'images/icons/icon-128x128.png', sizes: '128x128' }]
          },
          {
            name: 'Export Data',
            short_name: 'Export',
            url: '/data/export',
            icons: [{ src: 'images/icons/icon-128x128.png', sizes: '128x128' }]
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true
    // proxy: {
    //   '/api': {
    //     target: 'https://api.perceptionist.top/webhook-test',
    //     changeOrigin: true,
    //     rewrite: path => path.replace(/^\/api/, '')
    //   }
    // }
  }
});
