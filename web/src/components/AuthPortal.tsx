import React, { useState, useEffect } from 'react';
import {
  Flame,
  Mail,
  Lock,
  User as UserIcon,
  ChefHat,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Building2,
  Crown,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { authApi } from '../api/client.js';
import { Organization } from '../types/index.js';

export const AuthPortal: React.FC = () => {
  const { login, signup, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupType, setSignupType] = useState<'new_org' | 'join_org'>('new_org');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [orgName, setOrgName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // UI States
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Fetch available organizations for selector
  useEffect(() => {
    let isMounted = true;
    authApi
      .getOrganizations()
      .then((res) => {
        if (isMounted) {
          setOrganizations(res.organizations || []);
          if (res.organizations?.length > 0 && !selectedOrgId) {
            setSelectedOrgId(res.organizations[0].id);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch organizations list:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in your email and password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (signupType === 'new_org' && !orgName.trim()) {
        setError('Please enter the name of your Hotel or Restaurant.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login({ email: email.trim().toLowerCase(), password });
      } else {
        const payloadRole = signupType === 'new_org' ? 'Owner' : role;
        await signup({
          name: name.trim() || email.split('@')[0],
          email: email.trim().toLowerCase(),
          password,
          role: payloadRole,
          organization_id: signupType === 'join_org' ? selectedOrgId : undefined,
          organization_name: signupType === 'new_org' ? orgName.trim() : undefined,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await login({ email: demoEmail, password: 'password123' });
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const promptEmail = window.prompt(
        'Enter your Google account email to sign in (or use default chef account):',
        email || 'executive.chef@gmail.com'
      );
      if (!promptEmail) {
        setIsGoogleLoading(false);
        return;
      }

      const cleanEmail = promptEmail.toLowerCase().trim();
      const extractedName = cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      await loginWithGoogle({
        email: cleanEmail,
        name: extractedName,
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(extractedName)}&backgroundColor=0284c7`,
        googleId: `google-user-${Date.now()}`,
        organization_id: selectedOrgId || undefined,
        role: 'Executive Chef',
      });
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none font-sans">
      {/* Dynamic Ambient Glowing Light Mesh */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-sky-500/15 rounded-full blur-[120px] pointer-events-none animate-float-slow" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none animate-float-slow" style={{ animationDelay: '3s' }} />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Portal Container */}
      <div className="relative w-full max-w-md glass-panel border border-white/15 rounded-3xl shadow-glass-lg overflow-hidden backdrop-blur-2xl z-10">
        {/* Top Accent Gradient Bar */}
        <div className="h-1.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-amber-400" />

        {/* Brand Header */}
        <div className="p-8 pb-4 text-center">
          <div className="relative inline-flex mb-4">
            <div className="absolute -inset-1 bg-gradient-to-tr from-sky-500 via-indigo-500 to-amber-500 rounded-2xl blur opacity-75" />
            <div className="relative w-14 h-14 rounded-2xl bg-slate-900/90 border border-white/20 p-0.5 shadow-xl flex items-center justify-center">
              <Flame className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
            Kitchen<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300">Pulse</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous Multi-Tenant Kitchen Operations System
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-950/60 p-1 rounded-2xl border border-white/10 mt-6 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              Register Hotel / Team
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-8 mb-4 p-3 bg-rose-950/70 border border-rose-500/40 text-rose-300 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleAuth} className="p-8 pt-2 space-y-4">
          {mode === 'signup' && (
            <>
              {/* Registration Category Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setSignupType('new_org')}
                  className={`py-2 px-2 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    signupType === 'new_org'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-glow-amber'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>New Hotel (Owner)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignupType('join_org')}
                  className={`py-2 px-2 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    signupType === 'join_org'
                      ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40 shadow-glow-sky'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>Join Team (Admin/Staff)</span>
                </button>
              </div>

              {/* Organization Field based on selection */}
              {signupType === 'new_org' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-1.5">
                    Hotel / Restaurant Client Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. The Royal Grand Hotel & Spa, Mumbai"
                      className="w-full glass-input border-amber-500/40 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    You will be assigned the <span className="text-amber-400 font-semibold">Owner</span> role with full access to all stock, users & reports.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Select Hotel / Client Organization
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="w-full glass-input focus:border-sky-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer"
                      >
                        {organizations.map((o) => (
                          <option key={o.id} value={o.id} className="bg-slate-900 text-slate-200">
                            {o.name} ({o.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Assigned Role
                    </label>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full glass-input focus:border-sky-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer"
                      >
                        <option value="Admin" className="bg-slate-900 text-slate-200">Admin (Full User & Stock Access)</option>
                        <option value="Executive Chef" className="bg-slate-900 text-slate-200">Executive Chef</option>
                        <option value="Sous Chef" className="bg-slate-900 text-slate-200">Sous Chef</option>
                        <option value="Line Cook" className="bg-slate-900 text-slate-200">Line Cook</option>
                        <option value="Station Lead" className="bg-slate-900 text-slate-200">Station Lead</option>
                        <option value="Kitchen Manager" className="bg-slate-900 text-slate-200">Kitchen Manager</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Marco Pierre White"
                    className="w-full glass-input focus:border-sky-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chef@kitchenpulse.io"
                className="w-full glass-input focus:border-sky-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-400 font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              {mode === 'signup' && (
                <span className="text-[10px] text-slate-500">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full glass-input focus:border-sky-400 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full glass-input focus:border-sky-400 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-400 font-mono"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow-sky hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 text-slate-200 text-xs font-semibold rounded-xl transition-all backdrop-blur-md hover:border-white/20"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign In with Google</span>
          </button>
        </form>

        {/* Quick Demo Accounts Banner for Instant Verification */}
        <div className="bg-slate-950/70 border-t border-white/10 p-4 backdrop-blur-md">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-center mb-2.5">
            ⚡ Quick Demo Accounts (1-Click Switch)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner@grandpalace.com')}
              className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-amber-500/30 hover:border-amber-500/60 text-left transition-all backdrop-blur-md group"
            >
              <div className="font-bold text-amber-300 flex items-center gap-1 group-hover:text-amber-200">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Grand Palace Mumbai (Owner)
              </div>
              <div className="text-[9px] text-slate-400 font-mono mt-0.5">owner@grandpalace.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@grandpalace.com')}
              className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-sky-500/30 hover:border-sky-500/60 text-left transition-all backdrop-blur-md group"
            >
              <div className="font-bold text-sky-300 flex items-center gap-1 group-hover:text-sky-200">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                Grand Palace Mumbai (Admin)
              </div>
              <div className="text-[9px] text-slate-400 font-mono mt-0.5">admin@grandpalace.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner@bellanapoli.com')}
              className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-emerald-500/30 hover:border-emerald-500/60 text-left transition-all backdrop-blur-md group"
            >
              <div className="font-bold text-emerald-300 flex items-center gap-1 group-hover:text-emerald-200">
                <Crown className="w-3.5 h-3.5 text-emerald-400" />
                Bella Napoli Bengaluru (Owner)
              </div>
              <div className="text-[9px] text-slate-400 font-mono mt-0.5">owner@bellanapoli.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('cook@grandpalace.com')}
              className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 hover:border-white/20 text-left transition-all backdrop-blur-md group"
            >
              <div className="font-bold text-slate-300 flex items-center gap-1 group-hover:text-white">
                <ChefHat className="w-3.5 h-3.5 text-slate-400" />
                Grand Palace (Line Cook)
              </div>
              <div className="text-[9px] text-slate-400 font-mono mt-0.5">cook@grandpalace.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AuthPortal;
