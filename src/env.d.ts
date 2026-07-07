/// <reference types="astro/client" />
import type { AppSession, AppUser } from './lib/auth/session-resolver';
import type { EffectivePermissions } from './lib/permissions';

declare global {
  namespace App {
    interface Locals {
      session?: AppSession;
      user?: AppUser;
      permissions?: EffectivePermissions;
    }
  }
}

export {};
