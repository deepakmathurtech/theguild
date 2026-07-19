import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, Lock, Mail, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loginWithEmail, loginWithGoogle, registerWithEmail } from '../../lib/auth';

export default function EventBuyerAuth() {
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    document.title = 'Sign in to continue';
  }, []);

  const mapFirebaseError = (err: any): string => {
    const msg = err.message || '';
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
      return 'Incorrect email or password. Please try again.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'This email address is already in use by another account.';
    }
    if (msg.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    return err.message || 'Authentication failed. Please verify credentials.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await registerWithEmail(
          email,
          password,
          fullName,
          { cityId: '', cityName: '', stateId: '', stateName: '', countryId: 'IN', countryName: 'India' },
          [],
          []
        );
        setSuccess('Account created. You can continue to your checkout now.');
        navigate(redirectPath);
      } else {
        await loginWithEmail(email, password);
        navigate(redirectPath);
      }
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle();
      navigate(redirectPath);
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  if (firebaseUser && profile) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <Link to={redirectPath} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text)]">
          <ArrowLeft className="h-4 w-4" />
          Back to event
        </Link>

        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card-subtle)]/30 p-6 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-lg font-extrabold text-black shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Continue to this event</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Sign in or create an account to complete your ticket purchase securely.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Attendee flow</div>
            <div className="mt-2 text-sm font-extrabold">Sign in, return to the event, choose a ticket, and complete checkout.</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              After payment, your registration appears instantly in the organizer and host tools for check-in and certificate delivery.
            </div>
          </div>

          {error ? (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              <span>{success}</span>
            </div>
          ) : null}

          <div className="mt-6 flex gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === 'login' ? 'bg-[var(--primary)] text-black' : 'text-[var(--text-secondary)]'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === 'register' ? 'bg-[var(--primary)] text-black' : 'text-[var(--text-secondary)]'}`}
            >
              Register
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-3 text-sm font-semibold text-[var(--text)]"
          >
            <Shield className="h-4 w-4" />
            Continue with Google
          </button>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {mode === 'register' ? (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Full name</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-10 pr-4 text-sm"
                    required
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-10 pr-4 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-10 pr-4 text-sm"
                  required
                />
              </div>
            </div>

            {mode === 'register' ? (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Confirm password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-10 pr-4 text-sm"
                    required
                  />
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--primary)] px-3 py-3 text-sm font-extrabold text-black transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
