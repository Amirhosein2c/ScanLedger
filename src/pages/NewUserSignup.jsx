import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/loginRegistration.css';
import { apiPost } from '../utils/api.js';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth.js';

const NewUserSignup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSuccess = () => navigate('/dashboard');

  const { isReady: googleReady, triggerSignIn } = useGoogleOAuth({
    onSuccess: handleSuccess,
    onError: (err) => setMessage(err.message)
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (Object.values(form).some((value) => !value.trim())) {
      setMessage('Please fill in all fields.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        surname: form.surname.trim()
      };
      await apiPost('/user_auth', payload);

      localStorage.setItem('user_name', payload.name);
      localStorage.setItem('user_surname', payload.surname);
      localStorage.setItem('user_email', payload.email.toLowerCase());

      handleSuccess();
    } catch (error) {
      console.error('Signup webhook error', error);
      setMessage(error.message || 'Network error. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background-color)] text-[var(--text-color)]">
      <main className="flex flex-grow flex-col justify-center px-6 sm:px-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-12 text-center">
            <svg
              className="mx-auto mb-4 h-16 w-16 text-[var(--primary-color)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <h1 className="text-4xl font-bold tracking-tighter">Create Account</h1>
            <p className="mt-2 text-lg text-[var(--secondary-text-color)]">Join ScanLedger to get started</p>
          </div>

          {message && (
            <div className="mb-4 rounded-md border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {message}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="sr-only" htmlFor="signup_name">
                Name
              </label>
              <input
                id="signup_name"
                name="name"
                type="text"
                autoComplete="given-name"
                required
                placeholder="Name"
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                value={form.name}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="signup_surname">
                Surname
              </label>
              <input
                id="signup_surname"
                name="surname"
                type="text"
                autoComplete="family-name"
                required
                placeholder="Surname"
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                value={form.surname}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="signup_email">
                Email
              </label>
              <input
                id="signup_email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email"
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                value={form.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="signup_password">
                Password
              </label>
              <input
                id="signup_password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Password"
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                value={form.password}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="signup_confirm_password">
                Confirm Password
              </label>
              <input
                id="signup_confirm_password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Confirm Password"
                className="block w-full appearance-none rounded-md border-0 bg-[var(--field-background)] px-4 py-3 text-[var(--text-color)] placeholder-[var(--placeholder-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-1 focus:ring-offset-[var(--background-color)] sm:text-sm"
                value={form.confirmPassword}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-[var(--primary-color)] px-4 py-3 text-sm font-semibold leading-6 text-gray-900 shadow-sm transition-colors hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-color)]"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Sign Up'}
              </button>
            </div>
          </form>

          <div aria-hidden="true" className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[var(--background-color)] px-3 text-[var(--secondary-text-color)]">
                  Or continue with
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-white py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => triggerSignIn()}
              disabled={!googleReady || isSubmitting}
            >
              <img
                src="https://www.gstatic.com/images/branding/product/1x/googleg_24dp.png"
                alt="Google"
                className="h-5 w-5"
              />
              <span>{googleReady ? 'Signup with Google' : 'Loading Google...'}</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-[#1877F2] py-3 text-sm font-medium text-white transition-colors hover:bg-[#266fe0]"
              onClick={() => setMessage('Facebook signup coming soon!')}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.406.593 24 1.325 24h11.494v-9.294H9.847v-3.622h2.972V8.413c0-2.943 1.796-4.549 4.416-4.549 1.255 0 2.336.093 2.651.135v3.07h-1.82c-1.428 0-1.703.679-1.703 1.675v2.196h3.406l-.444 3.622h-2.962V24h5.807C23.406 24 24 23.406 24 22.674V1.326C24 .593 23.406 0 22.675 0z" />
              </svg>
              <span>Signup with Facebook</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-[#111827] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1f2937]"
              onClick={() => setMessage('Microsoft signup coming soon!')}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                alt="Microsoft"
                className="h-5 w-5"
              />
              <span>Signup with Microsoft</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-black py-3 text-sm font-medium text-white transition-colors hover:bg-gray-900"
              onClick={() => setMessage('Apple signup coming soon!')}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
                alt="Apple"
                className="h-5 w-5"
                style={{ filter: 'invert(1)' }}
              />
              <span>Signup with Apple</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 sm:px-8">
        <div className="text-center text-sm text-[var(--secondary-text-color)]">
          Already have an account?{' '}
          <button
            type="button"
            className="font-medium text-[var(--primary-color)] hover:text-opacity-80"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NewUserSignup;
