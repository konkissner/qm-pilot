# QM-Pilot Authentication (WP-03)

## Flows

### Internal users (E-Mail / Passwort + TOTP)
- Better Auth with Prisma adapter on the shared `User` model
- Tables: `AuthSession`, `AuthAccount`, `AuthVerification`, `TwoFactor`
- Min password length: 12 characters
- Mandatory TOTP for roles: `gl`, `rp`, `qmb`, `deputyRp`, `deputyQmb`, `admin`
- Login: `/login` → `/api/auth/*`

### Entra ID / OIDC (optional per tenant)
- Configure `TenantConfig.ssoEnabled` + `ssoConfig` JSON (`issuer`, `tenantId`, `clientId`, `clientSecret` encrypted)
- Microsoft button on `/login` when enabled
- No auto-provisioning: user must exist; link via `User.oidcSubject` after email match
- IdP 2FA satisfies requirement (no extra TOTP)

### PIN kiosk
- Device registration: `/kiosk/register` (requires `manageSystem`) → httpOnly `qm_kiosk_device` cookie
- Login: `/kiosk` → tile → 4-digit PIN → `KioskSession`
- Rules: throttle from 3rd attempt, lock 15 min after 5 failures (cross-device)
- Auto-lock: `TenantConfig.kioskAutoLockSeconds` (default 60s)

### Auditor accounts
- Activated from `AuditorInvite` with random initial password + `mustChangePassword`
- Valid only within `validFrom…validUntil`; read-only enforced in middleware

## Session rules
- Inactivity: `TenantConfig.sessionTimeoutMinutes` (default 30)
- Absolute max: 12 hours
- `retireUser()` revokes all `AuthSession` + `KioskSession` immediately

## Environment
```
BETTER_AUTH_SECRET=   # min 32 chars
BETTER_AUTH_URL=      # e.g. http://localhost:4321
DEFAULT_TENANT_SLUG=pharmazeutika-73-3
DEV_USER_PASSWORD=DevPassword12!   # seed only
AUTH_ENCRYPTION_KEY=               # SSO secret encryption
```

## Prototype alignment
- Login card layout, `.inp` inputs, primary green `#0f6e56`
- Kiosk: `.sb-ava` avatar circles, large touch tiles, PIN pad with dot indicators
- Auditor banner: yellow `#fff2d4` (`rb` style)
