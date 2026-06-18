import { useEffect, useState } from 'react';
import { OTPInput, SlotProps } from 'input-otp';
import api from '../../lib/api';
import {
  ShieldCheck, ShieldOff, Loader2, CheckCircle2, AlertCircle, Copy, Check,
} from 'lucide-react';

type Msg = { text: string; ok: boolean } | null;

// A single OTP slot styled to match the dark theme.
function OtpSlot(props: SlotProps) {
  return (
    <div
      className={[
        'w-10 h-12 flex items-center justify-center text-lg font-mono',
        'bg-background border text-foreground transition-colors',
        props.isActive ? 'border-brand' : 'border-border',
      ].join(' ')}
    >
      {props.char ?? (props.hasFakeCaret ? <span className="w-px h-5 bg-link animate-pulse" /> : '')}
    </div>
  );
}

function OtpField({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <OTPInput
      maxLength={6}
      value={value}
      onChange={onChange}
      disabled={disabled}
      containerClassName="flex items-center gap-2"
      render={({ slots }) => (
        <div className="flex items-center gap-2">
          {slots.map((slot, i) => (
            <OtpSlot key={i} {...slot} />
          ))}
        </div>
      )}
    />
  );
}

export function TwoFactorSetup() {
  // Read enabled state from the cached user object; the setup/enable/disable
  // calls keep localStorage in sync so this reflects reality after actions.
  const cachedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const [enabled, setEnabled] = useState<boolean>(!!cachedUser?.totp_enabled);

  const [setupLoading, setSetupLoading] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [code, setCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  // Disable flow uses its own code input.
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const syncEnabled = (val: boolean) => {
    setEnabled(val);
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (u) {
      u.totp_enabled = val;
      localStorage.setItem('user', JSON.stringify(u));
    }
  };

  // If the cached user doesn't carry the flag, leave it false; setup is always
  // available and re-running setup is harmless.
  useEffect(() => {
    if (cachedUser && typeof cachedUser.totp_enabled === 'boolean') {
      setEnabled(cachedUser.totp_enabled);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startSetup = async () => {
    setSetupLoading(true);
    setMsg(null);
    setQr(null);
    setSecret(null);
    setCode('');
    try {
      const res = await api.post('/api/2fa/setup');
      const data = res.data?.data ?? {};
      setQr(data.qr_data_url ?? null);
      setSecret(data.secret ?? null);
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.error || 'Failed to start 2FA setup', ok: false });
    } finally {
      setSetupLoading(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — manual entry still possible */
    }
  };

  const enable = async () => {
    if (code.length !== 6) {
      setMsg({ text: 'Enter the 6-digit code from your authenticator app', ok: false });
      return;
    }
    setActionLoading(true);
    setMsg(null);
    try {
      await api.post('/api/2fa/enable', { token: code });
      syncEnabled(true);
      setQr(null);
      setSecret(null);
      setCode('');
      setMsg({ text: 'Two-factor authentication is now enabled', ok: true });
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.error || 'Invalid verification code', ok: false });
    } finally {
      setActionLoading(false);
    }
  };

  const disable = async () => {
    if (disableCode.length !== 6) {
      setMsg({ text: 'Enter the 6-digit code to confirm disabling', ok: false });
      return;
    }
    setActionLoading(true);
    setMsg(null);
    try {
      await api.post('/api/2fa/disable', { token: disableCode });
      syncEnabled(false);
      setShowDisable(false);
      setDisableCode('');
      setMsg({ text: 'Two-factor authentication has been disabled', ok: true });
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.error || 'Invalid verification code', ok: false });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Status row */}
      <div className="flex items-center gap-3 mb-4">
        {enabled ? (
          <span className="flex items-center gap-1.5 text-[11px] px-2 py-1 bg-success/10 border border-success/30 text-success uppercase tracking-wider font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> Enabled
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] px-2 py-1 bg-muted-foreground/10 border border-border text-muted-foreground uppercase tracking-wider font-bold">
            <ShieldOff className="w-3.5 h-3.5" /> Disabled
          </span>
        )}
        <p className="text-sm text-muted-foreground">
          Protect your account with a time-based one-time code from an authenticator app.
        </p>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 mb-4 text-sm ${msg.ok ? 'text-success' : 'text-destructive'}`}>
          {msg.ok
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* ── Not enabled: setup + enable flow ── */}
      {!enabled && (
        <>
          {!qr ? (
            <button
              onClick={startSetup}
              disabled={setupLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Set Up Two-Factor Authentication
            </button>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="bg-white p-3 inline-block">
                  {/* qr_data_url is a data: URI returned by the backend */}
                  <img src={qr} alt="2FA QR code" className="w-44 h-44" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <p className="text-sm text-foreground">
                    1. Scan this QR code with Google Authenticator, Authy, or any TOTP app.
                  </p>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Or enter this key manually
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 min-w-0 truncate bg-background border border-border text-foreground text-xs font-mono px-3 py-2">
                        {secret}
                      </code>
                      <button
                        onClick={copySecret}
                        className="flex items-center gap-1 px-2.5 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-link text-xs transition-colors"
                        title="Copy key"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-foreground mb-2">2. Enter the 6-digit code to confirm.</p>
                <OtpField value={code} onChange={setCode} disabled={actionLoading} />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={enable}
                  disabled={actionLoading || code.length !== 6}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enable
                </button>
                <button
                  onClick={() => { setQr(null); setSecret(null); setCode(''); setMsg(null); }}
                  className="px-4 py-2.5 border border-border text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Enabled: disable flow ── */}
      {enabled && (
        <>
          {!showDisable ? (
            <button
              onClick={() => { setShowDisable(true); setMsg(null); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              <ShieldOff className="w-4 h-4" />
              Disable Two-Factor Authentication
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Enter a current 6-digit code from your authenticator app to disable 2FA.
              </p>
              <OtpField value={disableCode} onChange={setDisableCode} disabled={actionLoading} />
              <div className="flex items-center gap-3">
                <button
                  onClick={disable}
                  disabled={actionLoading || disableCode.length !== 6}
                  className="flex items-center gap-2 px-5 py-2.5 bg-destructive text-white text-sm font-medium hover:bg-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Disable
                </button>
                <button
                  onClick={() => { setShowDisable(false); setDisableCode(''); setMsg(null); }}
                  className="px-4 py-2.5 border border-border text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TwoFactorSetup;
