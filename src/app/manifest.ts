import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => ({
  name: 'ScanLedger',
  short_name: 'ScanLedger',
  description: 'ScanLedger digitizes and organizes financial documents with a streamlined mobile workflow.',
  start_url: '/',
  display: 'standalone',
  background_color: '#111827',
  theme_color: '#38e07b',
  lang: 'en',
  scope: '/',
  icons: [
    {
      src: '/images/icons/icon-72x72.png',
      sizes: '72x72',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/images/icons/icon-128x128.png',
      sizes: '128x128',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/images/icons/icon-152x152.png',
      sizes: '152x152',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/images/icons/icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/images/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any'
    }
  ]
});

export default manifest;
