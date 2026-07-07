import { useState } from 'react';

export default function LoginForm({ ssoEnabled }: { ssoEnabled: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      window.location.href = '/';
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { message?: string; twoFactorRedirect?: boolean };
    if (data.twoFactorRedirect || res.status === 403) {
      setStep('totp');
      return;
    }
    setError('E-Mail oder Passwort falsch.');
  }

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/two-factor/verify-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totpCode }),
    });
    setLoading(false);
    if (res.ok) {
      window.location.href = '/';
      return;
    }
    setError('Code ungültig. Bitte erneut versuchen.');
  }

  return (
    <div className="w-full max-w-md rounded-[14px] border border-[#e6ebe9] bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#38B098] text-lg font-bold text-white">
          QM
        </div>
        <h1 className="text-xl font-bold text-[#16241f]">Anmelden</h1>
      </div>

      {step === 'credentials' ? (
        <form onSubmit={submitCredentials} className="space-y-4">
          <label className="block text-sm text-[#16241f]">
            E-Mail
            <input
              className="inp mt-1 w-full rounded-[9px] border border-[#dce4e0] px-3 py-2"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-[#16241f]">
            Passwort
            <input
              className="inp mt-1 w-full rounded-[9px] border border-[#dce4e0] px-3 py-2"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-[#c62a0d]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[9px] bg-[#0f6e56] px-4 py-2.5 font-medium text-white hover:bg-[#0c5b47] disabled:opacity-60"
          >
            {loading ? 'Wird geprüft…' : 'Anmelden'}
          </button>
          {ssoEnabled && (
            <a
              href="/api/auth/sign-in/social/microsoft"
              className="block w-full rounded-[9px] border border-[#dce4e0] px-4 py-2.5 text-center text-sm font-medium text-[#16241f] hover:bg-[#eef1f0]"
            >
              Mit Microsoft anmelden
            </a>
          )}
        </form>
      ) : (
        <form onSubmit={submitTotp} className="space-y-4">
          <p className="text-sm text-[#8a978f]">Bitte geben Sie Ihren Authenticator-Code ein.</p>
          <label className="block text-sm text-[#16241f]">
            2FA-Code
            <input
              className="inp mt-1 w-full rounded-[9px] border border-[#dce4e0] px-3 py-2 tracking-widest"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-[#c62a0d]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[9px] bg-[#0f6e56] px-4 py-2.5 font-medium text-white"
          >
            Bestätigen
          </button>
        </form>
      )}
    </div>
  );
}
