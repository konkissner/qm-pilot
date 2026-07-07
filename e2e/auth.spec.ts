import { test, expect } from '@playwright/test';
import { DEV_USER_PASSWORD, lenaTotpSecret, authenticator } from './helpers/auth';

test.describe('Interner Login', () => {
  test('Lena mit Passwort + TOTP erreicht Cockpit', async ({ page }) => {
    const secret = lenaTotpSecret();
    if (!secret) test.skip();

    await page.goto('/login');
    await page.getByLabel('E-Mail').fill('l.frei@pharmazeutika.net');
    await page.getByLabel('Passwort').fill(DEV_USER_PASSWORD);
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(page.getByLabel('2FA-Code')).toBeVisible({ timeout: 15_000 });
    const code = authenticator.generate(secret);
    await page.getByLabel('2FA-Code').fill(code);
    await page.getByRole('button', { name: 'Bestätigen' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Angemeldet als Lena Frei')).toBeVisible();
  });
});
