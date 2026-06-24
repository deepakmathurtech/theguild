import { useState, useEffect } from 'react';
import { loginWithEmail, loginWithGoogle, registerWithEmail, sendVerificationEmail, resendVerificationEmail, sendPasswordReset, checkEmailVerified } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, Shield, Sparkles, Globe, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import SEO, { PAGE_SEO } from '../components/SEO';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'verify-email' | 'password-reset';

export default function Auth() {
  const { firebaseUser, profile } = useAuth();

  // Set page title on mount
  useEffect(() => {
    document.title = PAGE_SEO.auth.title;
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle GitHub OAuth login
  const handleGitHubLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'GitHub login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
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
        // Send verification email after registration
        if (firebaseUser) {
          await sendVerificationEmail(firebaseUser);
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
          return;
        }
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await sendPasswordReset(email);
      setSuccess('Password reset link sent! Check your email.');
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    }
  };

  // If already logged in, redirect to home
  if (firebaseUser && profile) {
    return <Navigate to="/" replace />;
  }

  // Password Reset Form
  if (mode === 'password-reset') {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-fade-up text-left">
        <div className="wizard-shell bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-black font-extrabold text-xl flex items-center justify-center mx-auto shadow-md mb-3">G</div>
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

          {/* Add password reset form here */}

          <div className="text-center mt-6">
            <button onClick={() => setMode('login')} className="text-xs text-[var(--primary)] font-bold hover:underline flex items-center gap-1 mx-auto">
              <ArrowLeft size={12} /> Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Auth Form
  return (
    <><SEO {...PAGE_SEO.auth} />
    <div className="max-w-md mx-auto py-12 px-4 animate-fade-up text-left">
      <div className="wizard-shell bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-lg relative overflow-hidden">
        {/* Decorative blurred orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--primary)]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[var(--accent)]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-black font-extrabold text-xl flex items-center justify-center mx-auto shadow-md mb-3">
            G
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text)]">
            {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Join the Guild' : mode === 'forgot-password' ? 'Reset Password' : mode === 'verify-email' ? 'Verify Email' : 'Set Password'}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            {mode === 'login' ? 'Sign in to access your growth dashboard.' : mode === 'register' ? 'Create your member account.' : mode === 'forgot-password' ? 'Enter your email to receive reset instructions.' : mode === 'verify-email' ? 'We sent a verification link to your email.' : 'Create a new password.'}
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
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
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
          <p className="text-xs text-[var(--text-muted)] text-center mt-4">
            By registering, you agree to our{' '}
            <Link to="/terms" className="text-[var(--primary)] hover:underline font-medium">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-[var(--primary)] hover:underline font-medium">Privacy Policy</Link>
          </p>
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

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={handleGitHubLogin}
                disabled={loading}
                className="secondary flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
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
    </div></>
  );
}