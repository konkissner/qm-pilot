import { test, expect } from '@playwright/test';

test.describe('Startseite', () => {
  test('lädt mit Titel QM-Pilot und hydrierter Island', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/QM-Pilot/);
    await expect(page.getByRole('heading', { name: /QM-Pilot/ })).toBeVisible();

    const button = page.getByTestId('hello-island-button');
    await expect(button).toBeVisible();
    await expect(button).toContainText('React-Island aktiv — Klicks: 0');

    await button.click();
    await expect(button).toContainText('React-Island aktiv — Klicks: 1');
  });
});
