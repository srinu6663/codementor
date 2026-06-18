import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Code, GraduationCap, BookOpen, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [year, setYear] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const pwStrength = (() => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: 'Too short', color: 'var(--destructive)', w: '25%' };
    if (password.length < 8) return { label: 'Weak', color: 'var(--warning)', w: '50%' };
    if (/[A-Z]/.test(password) && /\d/.test(password)) return { label: 'Strong', color: 'var(--success)', w: '100%' };
    return { label: 'Fair', color: 'var(--brand)', w: '75%' };
  })();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', {
        name, email, password, role,
        ...(role === 'student' ? {
          department: department.trim() || undefined,
          section: section.trim() || undefined,
          year: year ? Number(year) : undefined,
          roll_no: rollNo.trim() || undefined,
        } : {}),
      });
      if (res.data.success) {
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate(res.data.user.role === 'faculty' ? '/faculty/dashboard' : '/app/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:60px_60px] opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-brand flex items-center justify-center">
              <Code className="w-6 h-6 text-white" />
            </div>
            <span className="text-foreground font-bold text-2xl tracking-tight">CodeMentor</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
          <p className="text-muted-foreground mt-2 text-sm">Join thousands of students mastering DSA</p>
        </div>

        <div className="bg-card border border-border p-8">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive p-3 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'student', label: 'Student', sub: 'Solve & learn', icon: GraduationCap },
                  { key: 'faculty', label: 'Faculty', sub: 'Teach & assign', icon: BookOpen },
                ] as const).map(r => {
                  const Icon = r.icon;
                  const isActive = role === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      className={`flex items-center gap-3 p-3.5 border text-left transition-colors ${
                        isActive
                          ? 'bg-brand/10 border-brand/60 text-foreground'
                          : 'bg-background border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-brand' : ''}`} />
                      <div>
                        <div className="text-sm font-semibold">{r.label}</div>
                        <div className="text-[10px] mt-0.5 opacity-70">{r.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-background border border-border text-foreground text-sm px-4 py-3 outline-none focus:border-brand transition-colors placeholder-muted-foreground"
                placeholder="Your full name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-background border border-border text-foreground text-sm px-4 py-3 outline-none focus:border-brand transition-colors placeholder-muted-foreground"
                placeholder="you@university.edu"
                required
              />
            </div>

            {/* Academic details (students) */}
            {role === 'student' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Roll No.</label>
                  <input
                    type="text" value={rollNo} onChange={e => setRollNo(e.target.value)}
                    className="w-full bg-background border border-border text-foreground text-sm px-4 py-3 outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"
                    placeholder="e.g. 21CS045"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Department</label>
                  <input
                    type="text" value={department} onChange={e => setDepartment(e.target.value)}
                    className="w-full bg-background border border-border text-foreground text-sm px-4 py-3 outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"
                    placeholder="e.g. CSE"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Section</label>
                  <input
                    type="text" value={section} onChange={e => setSection(e.target.value)}
                    className="w-full bg-background border border-border text-foreground text-sm px-4 py-3 outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"
                    placeholder="e.g. A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Year</label>
                  <select
                    value={year} onChange={e => setYear(e.target.value)}
                    className="w-full bg-background border border-border text-foreground text-sm px-4 py-3 outline-none focus:border-brand transition-colors"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-background border border-border text-foreground text-sm px-4 py-3 pr-10 outline-none focus:border-brand transition-colors placeholder-muted-foreground"
                  placeholder="Min 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwStrength && (
                <div className="mt-2 space-y-1">
                  <div className="h-1 bg-border overflow-hidden">
                    <div className="h-full transition-all" style={{ width: pwStrength.w, background: pwStrength.color }} />
                  </div>
                  <p className="text-[11px] font-medium" style={{ color: pwStrength.color }}>{pwStrength.label}</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-hover text-white font-semibold py-3 transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-muted-foreground mt-6 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-brand hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-4">
          By registering, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
