'use client';

import type { ChangeEvent, CSSProperties, FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../components/BottomNav';

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

interface DocumentRowProps {
  document: DocumentSummary;
}

const DocumentRow: FC<DocumentRowProps> = ({ document }) => {
  const thumbnailStyle: CSSProperties = document.image
    ? { backgroundImage: `url('${document.image}')` }
    : { backgroundColor: '#1F2937' };

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

const DocumentManagementSearch = () => {
  const [query, setQuery] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem('exportedDocuments');
      if (!raw) {
        setDocuments([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setDocuments(parsed as DocumentSummary[]);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.warn('Failed to parse document list', error);
      setDocuments([]);
    }
  }, []);

  const filteredDocuments = useMemo(() => {
    if (!query.trim()) {
      return documents;
    }
    const normalized = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const haystack = [
        doc.type,
        doc.number,
        doc.vendor,
        doc.amount,
        doc.date,
        doc.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [documents, query]);

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  return (
    <div className="group/design-root relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#111827] pb-24 text-white">
      <div className="flex-grow">
        <header className="sticky top-0 z-10 bg-[#111827]/80 pt-safe backdrop-blur-sm">
          <div className="mt-8 flex items-center justify-between p-4">
            <div className="w-12" />
            <h2 className="flex-1 text-center text-lg font-bold">Documents</h2>
            <div className="flex w-12 items-center justify-end">
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center gap-2 overflow-hidden rounded-full text-base font-bold text-white transition-colors hover:bg-white/10"
                title="Add document"
              >
                <span className="material-symbols-outlined text-3xl">add</span>
              </button>
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#96c5a9]">
                search
              </span>
              <input
                className="h-12 w-full rounded-full border-none bg-[#1F2937] pl-11 pr-4 text-base text-white placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                placeholder="Search documents"
                value={query}
                onChange={handleQueryChange}
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto p-3">
            {['Date', 'Category', 'Vendor'].map((filter) => (
              <button
                key={filter}
                type="button"
                className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-[#1F2937] pl-4 pr-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                <span>{filter}</span>
                <span className="material-symbols-outlined text-xl">keyboard_arrow_down</span>
              </button>
            ))}
          </div>
        </header>
        <main className="px-4 pb-36">
          <div className="flex items-center justify-between pb-2 pt-4">
            <h3 className="text-lg font-bold text-white">Recent</h3>
            <button type="button" className="flex items-center gap-1 text-sm font-medium text-[var(--primary-color)]">
              <span>Sort</span>
              <span className="material-symbols-outlined text-xl">swap_vert</span>
            </button>
          </div>
          <div className="space-y-2 pb-6">
            {filteredDocuments.length === 0 && <p className="text-sm text-gray-400">No documents match your search.</p>}
            {filteredDocuments.map((document, index) => (
              <DocumentRow key={`${document.id || document.number || index}`} document={document} />
            ))}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default DocumentManagementSearch;
