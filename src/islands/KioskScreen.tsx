import { useCallback, useEffect, useState } from 'react';

interface KioskUser {
  id: string;
  firstName: string;
  lastName: string;
  initials: string | null;
  avatarColor: string | null;
  pinLockedUntil: string | null;
}

export default function KioskScreen() {
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [users, setUsers] = useState<KioskUser[]>([]);
  const [selected, setSelected] = useState<KioskUser | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [sessionUser, setSessionUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    const deviceRes = await fetch('/api/kiosk/device-check');
    const device = (await deviceRes.json()) as { registered: boolean };
    setRegistered(device.registered);
    if (!device.registered) return;
    const usersRes = await fetch('/api/kiosk/users');
    if (usersRes.ok) {
      const data = (await usersRes.json()) as { users: KioskUser[] };
      setUsers(data.users);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitPin() {
    if (!selected || pin.length !== 4) return;
    setError('');
    const res = await fetch('/api/kiosk/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selected.id, pin }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; pinLockedUntil?: string | null };
      setError(data.error ?? 'PIN falsch.');
      setPin('');
      return;
    }
    setSessionUser(`${selected.firstName} ${selected.lastName}`);
    setSelected(null);
    setPin('');
  }

  async function switchUser() {
    await fetch('/api/kiosk/logout', { method: 'POST' });
    setSessionUser(null);
    setPin('');
    setSelected(null);
    await load();
  }

  if (registered === null) {
    return <div className="p-8 text-center text-[#8a978f]">Wird geladen…</div>;
  }

  if (!registered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f0] p-6">
        <div className="rounded-[14px] border border-[#e6ebe9] bg-[#fff2d4] px-8 py-6 text-center text-[#8a5a06]">
          Gerät nicht registriert
        </div>
      </div>
    );
  }

  if (sessionUser) {
    return (
      <div className="min-h-screen bg-[#eef1f0] p-6">
        <div className="mx-auto max-w-3xl rounded-[14px] border border-[#e6ebe9] bg-white p-6">
          <p className="text-lg font-semibold text-[#16241f]">Angemeldet als {sessionUser}</p>
          <p className="mt-2 text-sm text-[#8a978f]">Kiosk-Session aktiv — Aufgabenbereich folgt in WP-04.</p>
          <button
            type="button"
            onClick={() => void switchUser()}
            className="mt-6 rounded-[9px] bg-[#0f6e56] px-5 py-3 text-white"
          >
            Wechseln
          </button>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#eef1f0] p-6">
        <h2 className="mb-4 text-xl font-semibold text-[#16241f]">
          {selected.firstName} {selected.lastName}
        </h2>
        <div className="mb-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${i < pin.length ? 'bg-[#0f6e56]' : 'bg-[#dce4e0]'}`}
            />
          ))}
        </div>
        {error && <p className="mb-3 text-sm text-[#c62a0d]">{error}</p>}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((key) => (
            <button
              key={String(key)}
              type="button"
              className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-white text-xl font-semibold shadow-sm"
              onClick={() => {
                if (key === 'C') setPin('');
                else if (key === 'OK') void submitPin();
                else if (pin.length < 4) setPin((p) => p + String(key));
              }}
            >
              {key}
            </button>
          ))}
        </div>
        <button type="button" className="mt-6 text-sm text-[#8a978f]" onClick={() => { setSelected(null); setPin(''); }}>
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef1f0] p-6">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => setSelected(user)}
            className="flex min-h-[140px] flex-col items-center justify-center rounded-[14px] border border-[#e6ebe9] bg-white p-4 shadow-sm"
          >
            <span
              className="sb-ava mb-3 flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
              style={{ background: user.avatarColor ?? 'linear-gradient(135deg,#38B098,#0f6e56)' }}
            >
              {user.initials ?? `${user.firstName[0]}${user.lastName[0]}`}
            </span>
            <span className="text-base font-medium text-[#16241f]">
              {user.firstName} {user.lastName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
