import { test, expect } from '@playwright/test';

test('welcome page loads with title and navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Genesis/);
  await expect(page.getByText(/school|learning|platform/i).first()).toBeVisible();
});

test('login page has form elements', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('form')).toBeVisible();
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
});

test('login page shows forgot password link', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText(/forgot password|reset/i).first()).toBeVisible();
});

test('404 page shown for unknown routes', async ({ page }) => {
  await page.goto('/this-path-does-not-exist-xyz');
  await expect(page.getByText(/404|not found/i).first()).toBeVisible();
});

test('welcome page has call-to-action button', async ({ page }) => {
  await page.goto('/');
  const cta = page.getByRole('button').or(page.getByRole('link'));
  await expect(cta.first()).toBeVisible();
});

test('notifications page redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/notifications');
  await expect(page.locator('form')).toBeVisible();
});

test('about page renders', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByText(/about|genesis|school/i).first()).toBeVisible();
});
