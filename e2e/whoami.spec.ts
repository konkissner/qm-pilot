import { test, expect } from '@playwright/test';

test.describe('DEV whoami endpoint', () => {
  test('lena persona', async ({ request }) => {
    const response = await request.get('/api/dev/whoami?persona=lena');
    test.skip(response.status() === 404, 'Seed data not available');
    const body = await response.json();
    expect(body.permissions.modules).toHaveLength(13);
    expect(body.permissions.inputs).toHaveLength(9);
  });
  test('ext persona', async ({ request }) => {
    const response = await request.get('/api/dev/whoami?persona=ext');
    test.skip(response.status() === 404, 'Seed data not available');
    const body = await response.json();
    expect(body.permissions.modules.sort()).toEqual(['documents', 'tasks', 'trainings']);
    expect(body.permissions.inputs).toHaveLength(0);
  });
  test('admin persona', async ({ request }) => {
    const response = await request.get('/api/dev/whoami?persona=admin');
    test.skip(response.status() === 404, 'Seed data not available');
    const body = await response.json();
    expect(body.permissions.modules.sort()).toEqual(['system', 'users']);
  });
});
