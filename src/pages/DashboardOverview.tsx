import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../styles/dashboardOverview.css';

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
  const thumbnailStyle = useMemo<React.CSSProperties>(() => {
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
  const navigate = useNavigate();
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
    <div className="group/design-root relative flex min-h-screen flex-col justify-between bg-[#111827] text-white">
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

        <main className="p-4">
          <section className="mb-8 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 rounded-xl bg-[#1F2937] p-4">
              <p className="text-sm font-medium text-gray-300">Total Docs</p>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-sm font-medium text-[var(--primary-color)]">0%</p>
            </div>
          <div className="flex flex-col gap-2 rounded-xl bg-[#1F2937] p-4">
              <p className="text-sm font-medium text-gray-300">Monthly Scans</p>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-sm font-medium text-[var(--primary-color)]">0%</p>
            </div>
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
        </main>
      </div>

      <div className="sticky bottom-0">
        <div className="flex justify-center p-4">
          <button
            type="button"
            onClick={() => navigate('/documents/scan')}
            className="flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-[var(--primary-color)] text-lg font-bold text-[#111827]"
          >
            <span className="material-symbols-outlined">qr_code_scanner</span>
            <span>Scan New Document</span>
          </button>
        </div>
        <BottomNav />
      </div>
    </div>
  );
};

export default DashboardOverview;
