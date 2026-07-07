import { test, expect } from '@playwright/test';
import { authenticator } from 'otplib';
import { LENA_TOTP_SECRET, DEV_USER_PASSWORD } from '../scripts/seed';

test.describe('Interner Login', () => {
  test('Lena mit Passwort + TOTP erreicht Cockpit', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-Mail').fill('l.frei@pharmazeutika.net');
    await page.getByLabel('Passwort').fill(DEV_USER_PASSWORD);
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(page.getByLabel('2FA-Code')).toBeVisible({ timeout: 15_000 });
    const code = authenticator.generate(LENA_TOTP_SECRET);
    await page.getByLabel('2FA-Code').fill(code);
    await page.getByRole('button', { name: 'Bestätigen' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Angemeldet als Lena Frei')).toBeVisible();
  });
});
