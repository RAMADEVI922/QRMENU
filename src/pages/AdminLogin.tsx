import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Mail, Delete, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  adminExists, createAdmin, verifyAdmin, saveAdminSession,
  sendOtp, verifyOtp, updatePasscode, getAdminSession,
} from '@/lib/adminAuth';

type Screen = 'login' | 'setup' | 'forgot-email' | 'forgot-otp' | 'forgot-reset';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(false);

  // If already logged in, go straight to admin
  useEffect(() => {
    if (getAdminSession()) navigate('/admin', { replace: true });
  }, [navigate]);

  // Login state
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Setup state
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPasscode, setSetupPasscode] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // ── Numpad ──────────────────────────────────────────────────────────────
  function Numpad({ value, onChange, max = 4, active = true }: { value: string; onChange: (v: string) => void; max?: number; active?: boolean }) {
    const handleDigit = (d: string) => { if (value.length < max) onChange(value + d); };
    const handleDel = () => onChange(value.slice(0, -1));

    // Keyboard support
    useEffect(() => {
      if (!active) return;
      const handler = (e: KeyboardEvent) => {
        // ignore if user is typing in an input/textarea
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (/^[0-9]$/.test(e.key)) handleDigit(e.key);
        else if (e.key === 'Backspace' || e.key === 'Delete') handleDel();
        else if (e.key === 'Enter') {
          // trigger login/verify by clicking the first enabled button after numpad
          const btn = document.querySelector<HTMLButtonElement>('button[data-submit]');
          btn?.click();
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [value, active]);

    return (
      <div>
        {/* Dots */}
        <div className="flex justify-center gap-3 mb-5">
          {Array.from({ length: max }).map((_, i) => (
            <div key={i} className={`h-4 w-4 rounded-full border-2 transition-all ${
              i < value.length ? 'bg-primary border-primary scale-110' : 'border-muted-foreground/30'
            }`} />
          ))}
        </div>
        {/* Grid */}
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => d === '⌫' ? handleDel() : d !== '' ? handleDigit(d) : undefined}
              disabled={d === ''}
              className={`h-14 rounded-xl text-lg font-bold transition-all select-none ${
                d === '' ? 'invisible' :
                d === '⌫' ? 'bg-muted text-muted-foreground hover:bg-muted/70 active:scale-95' :
                'bg-muted hover:bg-primary hover:text-white active:scale-95'
              }`}
            >
              {d === '⌫' ? <Delete className="h-5 w-5 mx-auto" /> : d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!email || passcode.length < 4) return;
    setLoading(true);
    setLoginError('');
    try {
      // First-time: check if any admin exists
      const exists = await adminExists();
      if (!exists) { setScreen('setup'); setLoading(false); return; }

      const admin = await verifyAdmin(email, passcode);
      if (!admin) {
        setLoginError('Wrong email or passcode. Try again.');
        setPasscode('');
        setLoading(false);
        return;
      }
      saveAdminSession(admin);
      navigate('/admin', { replace: true });
    } catch (e: any) {
      setLoginError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    if (!setupName || !setupEmail || setupPasscode.length < 4 || setupPasscode !== setupConfirm) {
      toast.error(setupPasscode !== setupConfirm ? 'Passcodes do not match' : 'Fill all fields');
      return;
    }
    setLoading(true);
    try {
      await createAdmin(setupEmail, setupPasscode, setupName);
      toast.success('Admin account created! Please log in.');
      setScreen('login');
      setEmail(setupEmail);
    } catch (e: any) {
      toast.error(e?.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!forgotEmail) return;
    setLoading(true);
    try {
      const sent = await sendOtp(forgotEmail);
      if (!sent) { toast.error('No admin account found with that email.'); setLoading(false); return; }
      toast.success('OTP sent to your email!');
      setScreen('forgot-otp');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    const result = verifyOtp(otpInput);
    if (!result.valid) { toast.error('Invalid or expired OTP.'); setOtpInput(''); return; }
    setVerifiedEmail(result.email!);
    setScreen('forgot-reset');
  };

  const handleResetPasscode = async () => {
    if (newPasscode.length < 4) { toast.error('Enter a 4-digit passcode'); return; }
    if (newPasscode !== confirmPasscode) { toast.error('Passcodes do not match'); return; }
    setLoading(true);
    try {
      await updatePasscode(verifiedEmail, newPasscode);
      toast.success('Passcode updated! Please log in.');
      setScreen('login');
      setEmail(verifiedEmail);
      setPasscode('');
    } catch (e: any) {
      toast.error(e?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-white mb-4 shadow-lg">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold">
            {screen === 'login' && 'Admin Login'}
            {screen === 'setup' && 'Create Admin Account'}
            {screen === 'forgot-email' && 'Forgot Passcode'}
            {screen === 'forgot-otp' && 'Enter OTP'}
            {screen === 'forgot-reset' && 'New Passcode'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {screen === 'login' && 'Enter your email and 4-digit passcode'}
            {screen === 'setup' && 'Set up your admin credentials'}
            {screen === 'forgot-email' && 'We\'ll send an OTP to your email'}
            {screen === 'forgot-otp' && `OTP sent to ${forgotEmail}`}
            {screen === 'forgot-reset' && 'Choose a new 4-digit passcode'}
          </p>
        </div>

        {/* ── LOGIN ── */}
        {screen === 'login' && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setLoginError(''); }}
                placeholder="admin@restaurant.com"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-muted-foreground">4-Digit Passcode</label>
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showPasscode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showPasscode ? 'Hide' : 'Show'}
                </button>
              </div>

              {showPasscode ? (
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={passcode}
                  onChange={(e) => { setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4)); setLoginError(''); }}
                  placeholder="••••"
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm text-center tracking-[0.5em] font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              ) : (
                <Numpad value={passcode} onChange={(v) => { setPasscode(v); setLoginError(''); }} />
              )}
            </div>

            {loginError && <p className="text-xs text-red-500 text-center">{loginError}</p>}

            <Button
              className="w-full"
              disabled={!email || passcode.length < 4 || loading}
              onClick={handleLogin}
              data-submit
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Login'}
            </Button>

            <div className="flex justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => { setScreen('forgot-email'); setForgotEmail(email); }}
                className="text-primary hover:underline"
              >
                Forgot passcode?
              </button>
              <button
                type="button"
                onClick={async () => {
                  const exists = await adminExists();
                  if (exists) { toast.error('Admin account already exists.'); return; }
                  setScreen('setup');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                First time setup
              </button>
            </div>
          </div>
        )}

        {/* ── SETUP ── */}
        {screen === 'setup' && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Your Name</label>
              <input
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="Restaurant Owner"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Email</label>
              <input
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                placeholder="admin@restaurant.com"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">4-Digit Passcode</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={setupPasscode}
                onChange={(e) => setSetupPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm text-center tracking-[0.5em] font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Confirm Passcode</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={setupConfirm}
                onChange={(e) => setSetupConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm text-center tracking-[0.5em] font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
            <Button className="w-full" disabled={loading} onClick={handleSetup}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
            </Button>
            <button type="button" onClick={() => setScreen('login')} className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to login
            </button>
          </div>
        )}

        {/* ── FORGOT — enter email ── */}
        {screen === 'forgot-email' && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Admin Email
              </label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="admin@restaurant.com"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
            <Button className="w-full" disabled={!forgotEmail || loading} onClick={handleSendOtp}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
            </Button>
            <button type="button" onClick={() => setScreen('login')} className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to login
            </button>
          </div>
        )}

        {/* ── FORGOT — enter OTP ── */}
        {screen === 'forgot-otp' && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Enter the 6-digit OTP sent to <span className="font-semibold text-foreground">{forgotEmail}</span>
            </p>
            <Numpad value={otpInput} onChange={setOtpInput} max={6} />
            <Button className="w-full mt-2" disabled={otpInput.length < 6} onClick={handleVerifyOtp} data-submit>
              Verify OTP
            </Button>
            <button type="button" onClick={() => { setScreen('forgot-email'); setOtpInput(''); }} className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Resend OTP
            </button>
          </div>
        )}

        {/* ── FORGOT — new passcode ── */}
        {screen === 'forgot-reset' && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">New 4-Digit Passcode</label>
              <Numpad value={newPasscode} onChange={setNewPasscode} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Confirm Passcode</label>
              <Numpad value={confirmPasscode} onChange={setConfirmPasscode} />
            </div>
            <Button
              className="w-full"
              disabled={newPasscode.length < 4 || confirmPasscode.length < 4 || loading}
              onClick={handleResetPasscode}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Passcode'}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
