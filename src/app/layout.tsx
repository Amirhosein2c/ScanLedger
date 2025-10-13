import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScanLedger',
  description: 'ScanLedger helps you digitize and organize financial documents effortlessly.',
  themeColor: '#111827',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/images/icons/icon-512x512.png', type: 'image/png', sizes: '512x512' }],
    apple: [{ url: '/images/icons/icon-152x152.png', type: 'image/png', sizes: '152x152' }]
  }
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>
      <Providers>{children}</Providers>
    </body>
  </html>
);

export default RootLayout;
