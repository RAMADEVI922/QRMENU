import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurantStore } from '@/store/restaurantStore';
import { fetchWaiters } from '@/lib/firebaseService';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, Delete, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const OTP_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_OTP_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

const OTP_KEY = 'waiterOtp';

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

type Screen = 'pick' | 'pin' | 'forgot-otp' | 'forgot-reset';

// Shared numpad component
function Numpad({ value, onChange, max = 4 }: { value: string; onChange: (v: string) => void; max?: number }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (/^[0-9]$/.test(e.key) && value.length < max) onChange(value + e.key);
      else if (e.key === 'Backspace' || e.key === 'Delete') onChange(value.slice(0, -1));
      else if (e.key === 'Enter') {
        document.querySelector<HTMLButtonElement>('button[data-submit]')?.click();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [value, max, onChange]);

  return (
    <div>
      <div className="flex justify-center gap-3 mb-5">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={`h-4 w-4 rounded-full border-2 transition-all ${
            i < value.length ? 'bg-primary border-primary scale-110' : 'border-muted-foreground/30'
          }`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (d === '⌫') onChange(value.slice(0, -1));
              else if (d !== '' && value.length < max) onChange(value + d);
            }}
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

export default function WaiterLogin() {
  const navigate = useNavigate();
  const { waiters, updateWaiterPin, setWaiters } = useRestaurantStore();
  const [loadingWaiters, setLoadingWaiters] = useState(true);

  // Always load from Firestore — never trust localStorage for waiters
  useEffect(() => {
    fetchWaiters().then((fbWaiters) => {
      if (fbWaiters.length > 0) setWaiters(fbWaiters);
    }).catch(() => {}).finally(() => setLoadingWaiters(false));
  }, []);

  const activeWaiters = waiters.filter((w) => w.active);

  const [screen, setScreen] = useState<Screen>('pick');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Forgot flow
  const [loading, setLoading] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const selectedWaiter = waiters.find((w) => w.id === selectedId);

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = () => {
    if (!selectedWaiter) return;
    if (selectedWaiter.pin !== pin) {
      setPinError('Wrong PIN. Try again.');
      setPin('');
      return;
    }
    sessionStorage.setItem('myWaiterId', selectedWaiter.id);
    sessionStorage.setItem('myWaiterName', selectedWaiter.name);
    navigate('/waiter');
  };

  // ── Send OTP ─────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!selectedWaiter) return;
    setLoading(true);
    try {
      const otp = generateOtp();
      const expiry = Date.now() + 10 * 60 * 1000;
      sessionStorage.setItem(OTP_KEY, JSON.stringify({ otp, expiry, waiterId: selectedWaiter.id }));

      await emailjs.send(SERVICE_ID, OTP_TEMPLATE_ID, {
        to_email: selectedWaiter.email,
        otp_code: otp,
        admin_name: selectedWaiter.name,
      }, PUBLIC_KEY).catch((err) => {
        console.error('[WaiterOTP] EmailJS error:', JSON.stringify(err));
        throw new Error(`EmailJS: ${err?.text || err?.message || JSON.stringify(err)}`);
      });

      toast.success(`OTP sent to ${selectedWaiter.email}`);
      setOtpInput('');
      setScreen('forgot-otp');
    } catch (e: any) {
      toast.error('Failed to send OTP: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ───────────────────────────────────────────────────────────
  const handleVerifyOtp = () => {
    const raw = sessionStorage.getItem(OTP_KEY);
    if (!raw) { toast.error('No OTP found. Please resend.'); return; }
    const { otp, expiry } = JSON.parse(raw);
    if (Date.now() > expiry) { toast.error('OTP expired. Please resend.'); setScreen('pin'); return; }
    if (otpInput !== otp) { toast.error('Wrong OTP. Try again.'); setOtpInput(''); return; }
    setNewPin('');
    setConfirmPin('');
    setScreen('forgot-reset');
  };

  // ── Reset PIN ────────────────────────────────────────────────────────────
  const handleResetPin = () => {
    if (newPin.length < 4) { toast.error('Enter a 4-digit PIN'); return; }
    if (newPin !== confirmPin) { toast.error('PINs do not match'); return; }
    if (!selectedId) return;
    updateWaiterPin(selectedId, newPin);
    sessionStorage.removeItem(OTP_KEY);
    toast.success('PIN updated! Please log in.');
    setPin('');
    setPinError('');
    setScreen('pin');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-white mb-4 shadow-lg">
            <UtensilsCrossed className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold">
            {screen === 'pick' && 'Waiter Login'}
            {screen === 'pin' && 'Enter PIN'}
            {screen === 'forgot-otp' && 'Enter OTP'}
            {screen === 'forgot-reset' && 'Reset PIN'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {screen === 'pick' && 'Select your name and enter your PIN'}
            {screen === 'pin' && `Welcome back, ${selectedWaiter?.name}`}
            {screen === 'forgot-otp' && `OTP sent to ${selectedWaiter?.email}`}
            {screen === 'forgot-reset' && 'Choose a new 4-digit PIN'}
          </p>
        </div>

        {/* ── PICK WAITER ── */}
        {screen === 'pick' && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Who are you?</p>
            {loadingWaiters ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : activeWaiters.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No active waiters. Ask admin to add your account.</p>
            ) : activeWaiters.map((w) => (
              <button
                key={w.id}
                onClick={() => { setSelectedId(w.id); setPin(''); setPinError(''); setScreen('pin'); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition text-left"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                  {w.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{w.name}</p>
                  <p className="text-xs text-muted-foreground">{w.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── ENTER PIN ── */}
        {screen === 'pin' && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <button onClick={() => { setScreen('pick'); setPin(''); setPinError(''); }}
              className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            <p className="text-sm font-semibold mb-4 text-center">
              PIN for <span className="text-primary">{selectedWaiter?.name}</span>
            </p>

            <Numpad value={pin} onChange={(v) => { setPin(v); setPinError(''); }} />

            {pinError && <p className="text-xs text-red-500 text-center mt-3">{pinError}</p>}

            <Button className="w-full mt-4" disabled={pin.length < 4} onClick={handleLogin} data-submit>
              Login
            </Button>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full mt-3 text-xs text-primary hover:underline flex items-center justify-center gap-1"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Forgot PIN? Send OTP to email
            </button>
          </div>
        )}

        {/* ── ENTER OTP ── */}
        {screen === 'forgot-otp' && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <p className="text-sm text-center text-muted-foreground mb-4">
              Enter the 6-digit OTP sent to <span className="font-semibold text-foreground">{selectedWaiter?.email}</span>
            </p>
            <Numpad value={otpInput} onChange={setOtpInput} max={6} />
            <Button className="w-full mt-4" disabled={otpInput.length < 6} onClick={handleVerifyOtp} data-submit>
              Verify OTP
            </Button>
            <button
              type="button"
              onClick={() => { setOtpInput(''); handleSendOtp(); }}
              disabled={loading}
              className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Resend OTP
            </button>
          </div>
        )}

        {/* ── RESET PIN ── */}
        {screen === 'forgot-reset' && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-3 text-center">New PIN</p>
              <Numpad value={newPin} onChange={setNewPin} />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-3 text-center">Confirm PIN</p>
              <Numpad value={confirmPin} onChange={setConfirmPin} />
            </div>
            <Button
              className="w-full"
              disabled={newPin.length < 4 || confirmPin.length < 4}
              onClick={handleResetPin}
            >
              Update PIN
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
