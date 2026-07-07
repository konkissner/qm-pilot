import { test, expect } from '@playwright/test';
import { DEV_USER_PASSWORD } from '../scripts/seed';

test.describe('Startseite', () => {
  test('erfordert Login und zeigt Cockpit nach Anmeldung', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('E-Mail').fill('j.reuter@pharmazeutika.net');
    await page.getByLabel('Passwort').fill(DEV_USER_PASSWORD);
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(page).toHaveURL('/', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /QM-Pilot Cockpit/ })).toBeVisible();
    await expect(page.getByTestId('hello-island-button')).toBeVisible();
  });
});
