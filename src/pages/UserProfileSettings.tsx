'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../components/BottomNav';

interface ProfileState {
  name: string;
  surname: string;
  email: string;
}

const UserProfileSettings = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileState>({
    name: '',
    surname: '',
    email: ''
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored: ProfileState = {
      name: window.localStorage.getItem('user_name') || '',
      surname: window.localStorage.getItem('user_surname') || '',
      email: window.localStorage.getItem('user_email') || ''
    };
    setProfile(stored);
  }, []);

  const fullName = useMemo(() => {
    const name = [profile.name, profile.surname].filter(Boolean).join(' ').trim();
    return name || 'Guest User';
  }, [profile.name, profile.surname]);

  const handleLogout = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem('user_name');
    window.localStorage.removeItem('user_surname');
    window.localStorage.removeItem('user_email');
    window.localStorage.removeItem('auth_method');
    router.push('/login');
  };

  const handleTemplateAction = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setMessage('Coming soon.');
    setTimeout(() => setMessage(null), 2000);
  };

  const sections = [
    {
      title: 'Documents Templates',
      items: [
        { label: 'Default Templates', action: handleTemplateAction },
        { label: 'Add New Class/Template', action: handleTemplateAction }
      ]
    },
    {
      title: 'Export Options',
      items: [
        { label: 'Export Destination', action: handleTemplateAction },
        { label: 'File Format', action: handleTemplateAction }
      ]
    },
    {
      title: 'Support',
      items: [
        { label: 'Help Center', action: handleTemplateAction },
        { label: 'Contact Support', action: handleTemplateAction }
      ]
    }
  ] as const;

  return (
    <div className="flex min-h-screen flex-col bg-[#0F172A] pb-24 text-white">
      <header className="sticky top-0 z-10 bg-[#0F172A]/90 backdrop-blur">
        <div className="flex items-center px-4 pb-2 pt-6">
          <button
            type="button"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/5"
            onClick={() => router.back()}
          >
            <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          </button>
          <h1 className="flex-1 pr-10 text-center text-xl font-semibold tracking-tight">Settings</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-28 pt-6">
        <section className="flex flex-col items-center text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#1F2937]">
            <span className="material-symbols-outlined text-6xl text-white/60">person</span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold">{fullName}</h2>
          <p className="mt-1 text-sm font-medium text-[#34D399]">Free Member</p>
          {profile.email && (
            <p className="mt-1 text-xs text-white/60">{profile.email}</p>
          )}
        </section>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                {section.title}
              </h3>
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131C2E]">
                {section.items.map((item, index) => {
                  const border =
                    index !== section.items.length - 1 ? 'border-b border-white/5' : '';
                  return (
                    <button
                      type="button"
                      key={item.label}
                      className={`flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-white ${border} hover:bg-white/5`}
                      onClick={item.action}
                    >
                      <span>{item.label}</span>
                      <span className="material-symbols-outlined text-lg text-white/40">chevron_right</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <button
          type="button"
          className="mt-8 flex w-full items-center justify-between rounded-2xl border border-red-400/30 bg-[#1C2435] px-5 py-4 text-base font-semibold text-red-300 hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <span>Logout</span>
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-200">
            {message}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default UserProfileSettings;
