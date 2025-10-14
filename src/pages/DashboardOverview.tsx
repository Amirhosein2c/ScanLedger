'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import BottomNav from '../components/BottomNav';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuthRedirect } from '../features/auth/hooks/useAuthRedirect';

interface DocumentSummary {
  id?: string;
  type?: string;
  number?: string;
  vendor?: string;
  amount?: string;
  date?: string;
  status?: string;
  image?: string;
}

interface RecentScanCardProps {
  document: DocumentSummary;
}

const RecentScanCard = ({ document }: RecentScanCardProps) => {
  const thumbnailStyle = useMemo<CSSProperties>(() => {
    if (!document.image) {
      return {};
    }
    return {
      backgroundImage: `url('${document.image}')`
    };
  }, [document.image]);

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-[#1F2937] p-3">
      <div className="size-14 rounded-lg bg-cover bg-center bg-no-repeat" style={thumbnailStyle} />
      <div className="flex-1">
        <p className="line-clamp-1 text-base font-medium text-white">
          {document.type || 'Document'}
          {document.number ? ` #${document.number}` : ''}
        </p>
        <p className="line-clamp-2 text-sm text-[#D1D5DB]">{document.date || ''}</p>
      </div>
      <div className="text-right">
        <p className="text-base font-bold text-white">
          {document.amount
            ? document.amount.startsWith('$')
              ? document.amount
              : `$${document.amount}`
            : ''}
        </p>
        <p className="text-sm text-[#D1D5DB]">{document.vendor || ''}</p>
      </div>
    </div>
  );
};

const DashboardOverview = () => {
  const router = useRouter();
  useAuthRedirect({ redirectUnauthenticatedTo: '/login' });
  const [userName, setUserName] = useState<string>('User');
  const [recentScans, setRecentScans] = useState<DocumentSummary[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const firstName = window.localStorage.getItem('user_name') || '';
    const surname = window.localStorage.getItem('user_surname') || '';
    const fullName = `${firstName} ${surname}`.trim();
    setUserName(fullName || 'User');

    try {
      const raw = window.localStorage.getItem('exportedDocuments');
      if (!raw) {
        setRecentScans([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentScans(parsed.slice(0, 5));
      } else {
        setRecentScans([]);
      }
    } catch (error) {
      console.warn('Failed to parse recent scans', error);
      setRecentScans([]);
    }
  }, []);

  return (
    <div className="group/design-root relative flex min-h-screen flex-col justify-between bg-[#111827] pb-24 text-white">
      <div className="mt-8 flex-grow">
        <header className="sticky top-0 z-10 bg-[#111827]/80 pt-safe backdrop-blur-sm">
          <div className="flex items-center p-4">
            <div className="flex items-center gap-4">
              <div
                className="size-10 rounded-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: 'url("https://www.gravatar.com/avatar/?d=mp&s=128")', backgroundColor: '#374151' }}
              />
              <div>
                <p className="text-sm text-gray-400">Welcome back,</p>
                <h1 className="text-xl font-bold text-white">{userName}</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 pb-36">
          <section className="mb-8 grid grid-cols-2 gap-4">
            <Card className="bg-[#1F2937]">
              <CardContent className="flex flex-col gap-2 p-4">
                <p className="text-sm font-medium text-gray-300">Total Docs</p>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-sm font-medium text-[var(--primary-color)]">0%</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1F2937]">
              <CardContent className="flex flex-col gap-2 p-4">
                <p className="text-sm font-medium text-gray-300">Monthly Scans</p>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-sm font-medium text-[var(--primary-color)]">0%</p>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Recent Scans</h2>
            <div className="space-y-2">
              {recentScans.length === 0 && <p className="text-sm text-gray-400">No recent scans yet.</p>}
              {recentScans.map((doc, index) => (
                <RecentScanCard key={`${doc.id || doc.number || index}`} document={doc} />
              ))}
            </div>
            <div className="h-4" />
          </section>

          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              className="h-14 w-full max-w-xs text-base font-semibold"
              onClick={() => router.push('/documents/scan')}
            >
              <span className="material-symbols-outlined">qr_code_scanner</span>
              <span className="ml-2">Scan New Document</span>
            </Button>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default DashboardOverview;
