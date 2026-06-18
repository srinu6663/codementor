import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Code, ShieldCheck, ArrowLeft, Bot, Trophy, BarChart3, Fingerprint, Mail, Lock } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

const HIGHLIGHTS = [
  { icon: Bot,         title: 'Socratic AI Tutor',       desc: 'Guides you with questions, never hands over the answer.' },
  { icon: Trophy,      title: 'Live Contests & Ratings', desc: 'ACM-style rounds with real-time leaderboards.' },
  { icon: Fingerprint, title: 'Integrity First',         desc: 'Plagiarism detection & proctored exams built in.' },
  { icon: BarChart3,   title: 'Placement Analytics',     desc: 'Track mastery and readiness for recruitment.' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 2FA step
  const [twofaRequired, setTwofaRequired] = useState(false);
  const [twofaUserId, setTwofaUserId] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const navigate = useNavigate();

  const completeLogin = (data: { user: { role: string }; accessToken: string; refreshToken: string }) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    navigate(data.user.role === 'faculty' ? '/faculty/dashboard' : '/app/dashboard', { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data.success) {
        if (res.data.twofa_required) {
          setTwofaRequired(true);
          setTwofaUserId(res.data.user_id);
        } else {
          completeLogin(res.data);
        }
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post('/api/2fa/verify', { user_id: twofaUserId, token: code.trim() });
      if (res.data.success) completeLogin(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const g = (window as any).google;
    if (!g?.accounts?.id) {
      setError('Google sign-in is not configured for this deployment.');
      return;
    }
    g.accounts.id.initialize({
      client_id: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID,
      callback: async (resp: { credential: string }) => {
        try {
          const res = await axios.post('/api/2fa/google', { id_token: resp.credential });
          if (res.data.success) completeLogin(res.data);
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { error?: string } } };
          setError(axiosErr.response?.data?.error || 'Google login failed');
        }
      },
    });
    g.accounts.id.prompt();
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-gradient-to-br from-brand via-brand to-purple">
        {/* decorative glows + grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.18),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25">
              <Code className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight">CodeMentor</span>
          </div>

          <div className="space-y-8 max-w-md">
            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight">
                Code. Learn. Grow.
              </h1>
              <p className="mt-3 text-white/80 text-[15px] leading-relaxed">
                An AI-powered adaptive coding platform that actually teaches — built for engineering classrooms.
              </p>
            </div>

            <div className="space-y-4">
              {HIGHLIGHTS.map(h => {
                const Icon = h.icon;
                return (
                  <div key={h.title} className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-[15px]">{h.title}</div>
                      <div className="text-white/70 text-[13px] leading-snug">{h.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-white/60 text-xs">Open-source coding education · Zero-licensing institutional deployment</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute top-5 right-5"><ThemeToggle /></div>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <Code className="w-6 h-6 text-white" />
            </div>
            <span className="text-foreground font-bold text-2xl tracking-tight">CodeMentor</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {twofaRequired ? 'Two-factor verification' : 'Welcome back'}
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {twofaRequired
                ? 'Enter the 6-digit code from your authenticator app.'
                : 'Sign in to continue to your workspace.'}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm mb-5">
              {error}
            </div>
          )}

          {!twofaRequired ? (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-card border border-border text-foreground text-sm rounded-lg pl-10 pr-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all placeholder:text-muted-foreground"
                      placeholder="student@university.edu"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-card border border-border text-foreground text-sm rounded-lg pl-10 pr-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all placeholder:text-muted-foreground"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center shadow-sm shadow-brand/30"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                className="w-full border border-border bg-card text-foreground font-medium py-3 rounded-lg transition-colors hover:bg-accent flex items-center justify-center gap-2.5 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75z"/></svg>
                Continue with Google
              </button>

              <p className="text-center text-muted-foreground mt-6 text-sm">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-link hover:underline font-medium">Register</Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-5">
              <div className="flex justify-center mb-1">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-link" />
                </div>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-card border border-border text-foreground text-center text-2xl font-mono tracking-[0.5em] rounded-lg px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all"
                placeholder="000000"
                required
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-brand hover:bg-brand-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => { setTwofaRequired(false); setCode(''); setError(null); }}
                className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
