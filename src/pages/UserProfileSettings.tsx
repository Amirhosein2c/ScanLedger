import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../styles/user_profile_settings.css';

interface ProfileState {
  name: string;
  surname: string;
  email: string;
}

const UserProfileSettings = () => {
  const navigate = useNavigate();
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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('user_name', profile.name);
    window.localStorage.setItem('user_surname', profile.surname);
    window.localStorage.setItem('user_email', profile.email.toLowerCase());
    setMessage('Profile updated');
    setTimeout(() => setMessage(null), 2500);
  };

  const handleLogout = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem('user_name');
    window.localStorage.removeItem('user_surname');
    window.localStorage.removeItem('user_email');
    window.localStorage.removeItem('auth_method');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#111827] text-white">
      <header className="sticky top-0 z-10 bg-[#111827]/80 backdrop-blur-sm">
        <div className="mt-8 flex items-center p-4">
          <button type="button" className="-ml-2 p-2" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
          </button>
          <h1 className="flex-1 pr-8 text-center text-xl font-bold tracking-tight">Profile</h1>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-4 pb-32">
        <div className="space-y-4 rounded-2xl bg-[#1F2937] p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Account Details</h2>
          <label className="block">
            <span className="text-sm font-medium text-[#C7D2FE]">First Name</span>
            <input
              type="text"
              name="name"
              className="mt-1 block w-full rounded-xl border-transparent bg-[#111827] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
              value={profile.name}
              onChange={handleChange}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#C7D2FE]">Last Name</span>
            <input
              type="text"
              name="surname"
              className="mt-1 block w-full rounded-xl border-transparent bg-[#111827] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
              value={profile.surname}
              onChange={handleChange}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#C7D2FE]">Email</span>
            <input
              type="email"
              name="email"
              className="mt-1 block w-full rounded-xl border-transparent bg-[#111827] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50"
              value={profile.email}
              onChange={handleChange}
            />
          </label>
          <button
            type="button"
            className="w-full rounded-full bg-[var(--primary-color)] py-3 text-base font-bold text-[#111827]"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>

        <div className="space-y-4 rounded-2xl bg-[#1F2937] p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="text-sm text-gray-400">
            Password reset and security configuration are managed through the ScanLedger admin portal.
          </p>
          <button
            type="button"
            className="w-full rounded-full bg-white/10 py-3 text-base font-semibold text-white hover:bg-white/15"
            onClick={() => setMessage('Password reset coming soon.')}
          >
            Reset Password
          </button>
        </div>

        <button
          type="button"
          className="w-full rounded-full border border-red-400/60 py-3 text-base font-semibold text-red-200"
          onClick={handleLogout}
        >
          Log Out
        </button>

        {message && (
          <div className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-4 py-2 text-center text-sm text-emerald-200">
            {message}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default UserProfileSettings;
