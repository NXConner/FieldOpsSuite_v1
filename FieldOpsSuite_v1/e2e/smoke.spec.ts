import { test, expect } from '@playwright/test';

test('dashboard loads and shows widgets', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/FieldOpsSuite/);
  await expect(page.locator('#iconDock .icon')).toHaveCountGreaterThan(0);
  await expect(page.locator('article.widget')).toHaveCountGreaterThan(0);
});

test('repos page loads', async ({ page }) => {
  await page.goto('/repos.html');
  await expect(page.getByRole('heading', { name: /Repositories/i })).toBeVisible();
});

