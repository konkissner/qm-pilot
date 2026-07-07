# URS addendum notes — Auth (WP-03)

## E5 deviation from URS-F-010 / URS-F-011
URS Stufe 0 v0.3 still references M365-only login. **Implemented per E5 (00_PLAN.md §3):**
- Base: E-Mail/Passwort + TOTP-2FA (Better Auth)
- Optional: Entra-ID/OIDC per tenant (`TenantConfig.ssoConfig`)
- Formal URS text update tracked in **WP-52**

## Kiosk device registration (beyond URS-F-013)
URS-F-013 describes tile + PIN. **Device registration** (registered devices only, revoke, audit) is an ALCOA+ hardening per 00_PLAN.md §5.5 — not explicit in URS-F-013. Document in WP-52 addendum.
