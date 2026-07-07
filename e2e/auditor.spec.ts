import { test, expect } from '@playwright/test';
import { DEV_USER_PASSWORD } from '../scripts/seed';

test.describe('Auditor', () => {
  test('Login zeigt Banner und blockiert Mutation', async ({ page, request }) => {
    await page.goto('/login');
    await page.getByLabel('E-Mail').fill('audit@extern.example');
    await page.getByLabel('Passwort').fill(DEV_USER_PASSWORD);
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page).toHaveURL('/', { timeout: 15_000 });
    await expect(page.getByText('Auditor-Modus — Lesezugriff')).toBeVisible();

    const res = await request.post('/api/kiosk/register', { data: { name: 'X' } });
    expect(res.status()).toBe(403);
  });
});
