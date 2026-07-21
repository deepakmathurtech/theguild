import { useState, useEffect } from 'react';
import { loginWithEmail, loginWithGoogle, registerWithEmail, sendVerificationEmail, resendVerificationEmail, sendPasswordReset, checkEmailVerified } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, Shield, Sparkles, Globe, ArrowLeft, AlertCircle, CheckCircle, User } from 'lucide-react';
import SEO, { PAGE_SEO } from '../components/SEO';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'verify-email' | 'password-reset';

export default function Auth() {
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  // Set page title on mount
  useEffect(() => {
    document.title = PAGE_SEO.auth.title;
  }, []);
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    if (msg.includes('auth/popup-closed-by-user')) {
      return 'Sign-in window closed before completion. Please try again.';
    }
    return err.message || 'Authentication failed. Please verify credentials.';
  };

  // Handle Google OAuth login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
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
        const newUser = await registerWithEmail(
          email,
          password,
          fullName,
          { cityId: '', cityName: '', stateId: '', stateName: '', countryId: 'IN', countryName: 'India' },
          [],
          []
        );
        // Send verification email after registration
        if (newUser) {
          await sendVerificationEmail(newUser);
        }
        setMode('verify-email');
        setSuccess('Account created! Please check your email to verify your account.');
      } else {
        await loginWithEmail(email, password);
        // Check if email is verified
        await firebaseUser?.reload();
        if (!firebaseUser?.emailVerified) {
          setMode('verify-email');
          setError('Please verify your email before continuing.');
          setLoading(false);
          return;
        }
        navigate(redirectPath);
      }
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await sendPasswordReset(email);
      setSuccess('Password reset link sent! Check your email.');
      setMode('login');
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // If already logged in, redirect to home
  if (firebaseUser && profile) {
    return <Navigate to={redirectPath} replace />;
  }

  // Render split pane layout containing either password-reset form or standard auth flow
  return (
    <>
      <SEO {...PAGE_SEO.auth} />
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg)] px-4 py-8 md:py-12 transition-colors duration-200">
        <div className="flex w-full max-w-4xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-2xl animate-fade-up">
          
          {/* Left panel - Branding (visible on desktop md and up) */}
          <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-10 bg-gradient-to-br from-[var(--card-subtle)] via-[var(--bg-alt)] to-[var(--bg)] overflow-hidden">
            {/* Ambient gradients */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Top Logo */}
            <div className="flex items-center gap-3 z-10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-black font-extrabold text-base shadow-lg overflow-hidden">
                <img src="/guild-logo.png" alt="Guild" className="w-full h-full object-contain" />
              </div>
              <div>
                <strong className="block text-xs font-bold tracking-widest text-[var(--text)] uppercase">GUILD</strong>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Ecosystem</span>
              </div>
            </div>

            {/* Middle Feature Highlights */}
            <div className="my-auto space-y-6 z-10 py-6">
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)] leading-tight">
                Unlock collaborative growth and verified achievements.
              </h2>
              <div className="space-y-4 text-xs text-[var(--text-secondary)]">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)] shrink-0 font-bold mt-0.5">✓</div>
                  <div>
                    <strong className="block text-[var(--text)] font-semibold mb-0.5">Decentralized Quests</strong>
                    <span>Claim tasks, deliver outcomes, and establish proof-of-work reputational assets.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)] shrink-0 font-bold mt-0.5">✓</div>
                  <div>
                    <strong className="block text-[var(--text)] font-semibold mb-0.5">Connected Event Suite</strong>
                    <span>Publish event landing pages, manage ticketing, and issue verified completion certificates.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)] shrink-0 font-bold mt-0.5">✓</div>
                  <div>
                    <strong className="block text-[var(--text)] font-semibold mb-0.5">Trust & Reputation Ledger</strong>
                    <span>Gain verification badges, grow rankings, and prove outcomes across the network.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="text-[10px] text-[var(--text-muted)] tracking-wider z-10">
              © {new Date().getFullYear()} GUILD Platform. All rights reserved.
            </div>
          </div>

          {/* Right panel - Form (always visible) */}
          <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-center text-left relative overflow-hidden">
            {/* Ambient gradients for mobile */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--primary)]/15 rounded-full blur-3xl pointer-events-none md:hidden" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[var(--accent)]/15 rounded-full blur-3xl pointer-events-none md:hidden" />

            {mode === 'password-reset' ? (
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-black font-extrabold text-xl flex items-center justify-center mx-auto shadow-md mb-3 md:hidden">G</div>
                  <h2 className="text-2xl font-black tracking-tight text-[var(--text)]">Create New Password</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5">Enter a new secure password for your account.</p>
                </div>

                {error && (
                  <div className="p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-500 font-semibold flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-3.5 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-500 font-semibold flex items-center gap-2">
                    <CheckCircle size={14} />
                    <span>{success}</span>
                  </div>
                )}

                {/* Password reset input forms */}
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="password"
                        placeholder="Enter new password"
                        className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--input-bg)] text-sm focus:outline-none focus:border-[var(--primary)] transition-all"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="primary w-full py-3 rounded-xl font-bold">
                    Update Password
                  </button>
                </form>

                <div className="text-center mt-6">
                  <button onClick={() => setMode('login')} className="text-xs text-[var(--primary)] font-bold hover:underline flex items-center gap-1 mx-auto">
                    <ArrowLeft size={12} /> Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-black font-extrabold text-xl flex items-center justify-center mx-auto shadow-md mb-3 md:hidden">G</div>
                  <h2 className="text-2xl font-black tracking-tight text-[var(--text)]">
                    {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Join the Guild' : mode === 'forgot-password' ? 'Reset Password' : 'Verify Email'}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5">
                    {mode === 'login' ? 'Sign in to access your growth dashboard.' : mode === 'register' ? 'Create your member account.' : mode === 'forgot-password' ? 'Enter your email to receive reset instructions.' : 'We sent a verification link to your email.'}
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-500 font-semibold flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-3.5 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-500 font-semibold flex items-center gap-2">
                    <CheckCircle size={14} />
                    <span>{success}</span>
                  </div>
                )}

                <form onSubmit={mode === 'forgot-password' ? handleForgotPassword : handleSubmit} className="space-y-4">
                  {mode === 'register' && (
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">Full Name</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--input-bg)] text-sm focus:outline-none focus:border-[var(--primary)] transition-all"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {(mode === 'login' || mode === 'register' || mode === 'forgot-password') && (
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">Email</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--input-bg)] text-sm focus:outline-none focus:border-[var(--primary)] transition-all"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {(mode === 'login' || mode === 'register') && (
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--input-bg)] text-sm focus:outline-none focus:border-[var(--primary)] transition-all"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {mode === 'register' && (
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--input-bg)] text-sm focus:outline-none focus:border-[var(--primary)] transition-all"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {mode === 'login' && (
                    <div className="text-right">
                      <button type="button" onClick={() => setMode('forgot-password')} className="text-xs text-[var(--primary)] font-semibold hover:underline">
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="animate-pulse">Processing...</span>
                    ) : mode === 'login' ? (
                      <>
                        <Shield size={16} />
                        <span>Sign In</span>
                      </>
                    ) : mode === 'register' ? (
                      <>
                        <Sparkles size={16} />
                        <span>Create Account</span>
                      </>
                    ) : mode === 'forgot-password' ? (
                      <>
                        <Mail size={16} />
                        <span>Send Reset Link</span>
                      </>
                    ) : (
                      <>
                        <Shield size={16} />
                        <span>Verify Email</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Legal disclaimer for register */}
                {mode === 'register' && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-3 text-xs text-[var(--text-secondary)] mt-4">
                    <p className="mb-2">
                      By registering, you agree to our{' '}
                      <Link to="/terms" className="text-[var(--primary)] hover:underline font-medium">Terms of Service</Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="text-[var(--primary)] hover:underline font-medium">Privacy Policy</Link>.
                    </p>
                    <label className="flex items-start gap-2">
                      <input type="checkbox" required className="mt-0.5" />
                      <span>I consent to Guild processing my account and participation data for authentication, trust verification, and service delivery.</span>
                    </label>
                  </div>
                )}

                {/* OAuth Section */}
                {(mode === 'login' || mode === 'register') && (
                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--border)]"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-3 bg-[var(--card)] text-[var(--text-muted)] font-semibold">or continue with</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="secondary flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold w-full"
                      >
                        <Globe size={14} />
                        <span>Google</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode Toggle */}
                <div className="text-center mt-6">
                  {mode === 'login' && (
                    <p className="text-xs text-[var(--text-muted)]">
                      New member?{' '}
                      <button onClick={() => setMode('register')} className="text-[var(--primary)] font-bold hover:underline">
                        Create Account
                      </button>
                    </p>
                  )}
                  {mode === 'register' && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Already have an account?{' '}
                      <button onClick={() => setMode('login')} className="text-[var(--primary)] font-bold hover:underline">
                        Sign In
                      </button>
                    </p>
                  )}
                  {mode === 'forgot-password' && (
                    <button onClick={() => setMode('login')} className="text-xs text-[var(--primary)] font-bold hover:underline flex items-center gap-1 mx-auto">
                      <ArrowLeft size={12} /> Back to Sign In
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}