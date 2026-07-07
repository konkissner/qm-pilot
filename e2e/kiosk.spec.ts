import { test, expect } from '@playwright/test';
import { EXTERNAL_PIN } from '../scripts/seed';

test.describe('PIN-Kiosk', () => {
  test('nicht registriertes Gerät zeigt Hinweis', async ({ page }) => {
    await page.goto('/kiosk');
    await expect(page.getByText('Gerät nicht registriert')).toBeVisible();
  });

  test('Registrierung → Kachel → PIN → Wechsel', async ({ page, context }) => {
    const impersonate = await context.request.post('/api/dev/impersonate', {
      data: { persona: 'admin' },
    });
    expect(impersonate.ok()).toBeTruthy();
    const cookies = await impersonate.headersArray();
    for (const h of cookies) {
      if (h.name.toLowerCase() === 'set-cookie') {
        const [pair] = h.value.split(';');
        const [name, value] = pair.split('=');
        await context.addCookies([{ name, value, domain: 'localhost', path: '/' }]);
      }
    }

    await page.goto('/kiosk/register');
    await page.locator('input[name="name"]').fill('E2E Kiosk');
    await page.getByRole('button', { name: 'Registrieren' }).click();
    await expect(page).toHaveURL('/kiosk');

    await expect(page.getByText('Ana Ilic')).toBeVisible({ timeout: 10_000 });
    await page.getByText('Ana Ilic').click();
    for (const digit of EXTERNAL_PIN.split('')) {
      await page.getByRole('button', { name: digit }).click();
    }
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.getByText('Angemeldet als Ana Ilic')).toBeVisible();
    await page.getByRole('button', { name: 'Wechseln' }).click();
    await expect(page.getByText('Ana Ilic')).toBeVisible();
  });
});
