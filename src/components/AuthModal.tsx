import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  Globe,
  AlertTriangle,
  CheckCircle2,
  LogIn,
  UserPlus
} from 'lucide-react';
import type { LanguageCode, UserProfile } from '../utils/editorialLogic';

export type AuthModalTab = 'login' | 'register' | 'admin';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: AuthModalTab;
  onClose: () => void;
  onAuthenticated: (user: UserProfile, token: string) => void;
  onGoogleSignIn: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onAuthenticated,
  onGoogleSignIn
}) => {
  const [activeTab, setActiveTab] = useState<AuthModalTab>(initialTab);

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>('en');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent, isAdminPortal: boolean) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMsg('Please enter your email or username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isAdminPortal ? '/api/auth/admin-login' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed.');
        return;
      }
      onAuthenticated(data.user, data.token);
      onClose();
    } catch {
      setErrorMsg('Network error while signing in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Username is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          preferredLanguage
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Registration failed.');
        return;
      }
      setSuccessMsg('Account created with USER role. Signing you in...');
      onAuthenticated(data.user, data.token);
      onClose();
    } catch {
      setErrorMsg('Network error during registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChiefEditorSession = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/chief-editor-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Unable to verify Chief Editor session.');
        return;
      }
      onAuthenticated(data.user, data.token);
      onClose();
    } catch {
      setErrorMsg('Network error verifying Chief Editor session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Safwa Publishers Account Authentication"
      className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-[#FBF9F5] border border-stone-300 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F3EFE6] border-b border-stone-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-amber-900 font-semibold">
              Safwa Publishers · Secure Access
            </p>
            <h2 className="text-xl font-display font-bold text-stone-900">
              {activeTab === 'register'
                ? 'Create Author & Reader Account'
                : activeTab === 'admin'
                ? 'Administrator Portal Login'
                : 'Sign In to Your Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-[#F3EFE6]/60 border-b border-stone-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
            }}
            className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'login'
                ? 'bg-stone-900 text-white'
                : 'text-stone-700 hover:text-stone-950'
            }`}
          >
            Member Login
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg('');
            }}
            className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'register'
                ? 'bg-stone-900 text-white'
                : 'text-stone-700 hover:text-stone-950'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMsg('');
            }}
            className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-amber-900 text-white'
                : 'text-stone-700 hover:text-stone-950'
            }`}
          >
            Admin Login
          </button>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-950/10 border border-rose-800/40 text-xs font-medium text-rose-900 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-950/10 border border-emerald-800/40 text-xs font-medium text-emerald-900 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: USER LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={(e) => handleLoginSubmit(e, false)} className="space-y-4">
              <div>
                <label
                  htmlFor="auth-login-identifier"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Email Address or Username *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    id="auth-login-identifier"
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="you@example.com or username"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-login-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    id="auth-login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
              </button>

              <div className="pt-3 border-t border-stone-200 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoogleSignIn();
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  Continue with Google Account
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: USER REGISTRATION */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-fullname"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      id="reg-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g.,Tariq Al-Zahrani"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-amber-800"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-username"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Username *
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_\-.]/g, ''))
                    }
                    placeholder="e.g., tariq_poetics"
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 font-mono-num focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                >
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="author@domain.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Password *
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-amber-800"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Confirm Password *
                  </label>
                  <input
                    id="reg-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-preferred-language"
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-amber-800" />
                  <span>Preferred Literary Language *</span>
                </label>
                <select
                  id="reg-preferred-language"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value as LanguageCode)}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-amber-800"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic (العربية)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                </select>
              </div>

              <p className="text-[11px] text-stone-500">
                All new registrations are created with standard <strong>USER</strong> permissions.
                Passwords are salted and hashed on the server.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
              </button>
            </form>
          )}

          {/* TAB 3: ADMIN LOGIN */}
          {activeTab === 'admin' && (
            <form onSubmit={(e) => handleLoginSubmit(e, true)} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F3EFE6] border border-stone-300 text-xs text-stone-700 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-900 block">
                    Restricted Editorial Administrator Console
                  </strong>
                  <span>
                    Only accounts provisioned with the server-side <strong>ADMIN</strong> role may
                    sign in through this portal.
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-login-identifier"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Admin Email or Username *
                </label>
                <input
                  id="admin-login-identifier"
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Admin email or username"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-amber-800"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-login-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Admin Password *
                </label>
                <input
                  id="admin-login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-amber-800"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-amber-900 rounded-xl hover:bg-amber-950 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Verifying Admin...' : 'Sign In to Admin Dashboard'}</span>
              </button>

              <div className="pt-3 border-t border-stone-200 space-y-2">
                <button
                  type="button"
                  onClick={handleChiefEditorSession}
                  disabled={isSubmitting}
                  className="w-full py-2 px-3 text-xs font-semibold text-stone-900 bg-[#F3EFE6] border border-stone-300 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Activate Official Chief Editor Session (Server-Verified)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
