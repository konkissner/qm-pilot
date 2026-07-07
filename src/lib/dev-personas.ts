/** DEV-only persona keys for /api/dev/whoami — lookup by name, no tenant-specific constants in src/. */
export const DEV_PERSONA_LOOKUP = {
  lena: { firstName: 'Lena', lastName: 'Frei' },
  ext: { firstName: 'Ana', lastName: 'Ilic', email: null as null },
  admin: { firstName: 'Admin', lastName: 'IT' },
} as const;

export type DevPersonaKey = keyof typeof DEV_PERSONA_LOOKUP;
