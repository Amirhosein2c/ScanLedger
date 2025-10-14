'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../components/BottomNav';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useAuthRedirect } from '../features/auth/hooks/useAuthRedirect';

interface ProfileState {
  name: string;
  surname: string;
  email: string;
}

const UserProfileSettings = () => {
  const router = useRouter();
  useAuthRedirect({ redirectUnauthenticatedTo: '/login' });
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
          <Button
            variant="ghost"
            size="icon"
            className="-ml-1 rounded-full bg-white/5 hover:bg-white/10"
            onClick={() => router.back()}
          >
            <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          </Button>
          <h1 className="flex-1 pr-12 text-center text-xl font-semibold tracking-tight">Settings</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-28 pt-6">
        <Card className="bg-[#131C2E] text-center">
          <CardHeader className="flex items-center gap-3 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#1F2937]">
              <span className="material-symbols-outlined text-6xl text-white/60">person</span>
            </div>
            <div className="flex flex-col items-center">
              <CardTitle className="text-2xl font-semibold text-white">{fullName}</CardTitle>
              <Badge variant="success" className="mt-2">
                Free Member
              </Badge>
              {profile.email && (
                <p className="mt-2 text-xs text-white/60">{profile.email}</p>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                {section.title}
              </h3>
              <Card className="overflow-hidden bg-[#131C2E]">
                <CardContent className="p-0">
                  {section.items.map((item, index) => (
                    <div key={item.label}>
                      <Button
                        variant="ghost"
                        className="flex w-full items-center justify-between rounded-none px-5 py-4 text-left text-sm font-medium text-white hover:bg-white/5"
                        onClick={item.action}
                      >
                        <span>{item.label}</span>
                        <span className="material-symbols-outlined text-lg text-white/40">chevron_right</span>
                      </Button>
                      {index !== section.items.length - 1 && <Separator className="bg-white/5" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <Card className="mt-8 bg-[#131C2E]">
          <CardContent className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-base font-semibold text-red-300">Logout</p>
              <p className="text-xs text-white/50">Sign out from this device</p>
            </div>
            <Button
              variant="outline"
              className="border-red-400/40 text-red-300 hover:bg-red-500/10"
              onClick={handleLogout}
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </Button>
          </CardContent>
        </Card>

        {message && (
          <Card className="mt-4 border-emerald-400/40 bg-emerald-500/10">
            <CardContent className="px-4 py-3 text-center text-sm text-emerald-200">
              {message}
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default UserProfileSettings;
