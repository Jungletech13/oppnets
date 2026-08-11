import { test, expect } from './fixtures';

test.describe('authentication bot', () => {
  test('loads the signed-out experience with OppNets metadata and owned brand assets', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('OppNets — The Opportunity Network');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://oppnets.com/');
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /OppNets is the Opportunity Network/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://oppnets.com/opengraph.png');
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', 'https://oppnets.com/opengraph.png');
    await expect(page.getByRole('heading', { name: 'Opportunity Network' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
  });

  test('reports invalid returning-user credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill('wrong@oppnets.test');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In', exact: true }).last().click();

    await expect(page.getByText('Invalid E2E test credentials.')).toBeVisible();
  });

  test('simulates a new user signup and explains email confirmation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign Up', exact: true }).first().click();
    await page.getByLabel('Email').fill('new.user@oppnets.test');
    await page.getByLabel('Password').fill('OppNetsTest1!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByRole('status')).toHaveText(
      'Check your email for a confirmation link, then return here to sign in.',
    );
    await expect(page.getByRole('button', { name: 'Sign In', exact: true }).first()).toHaveClass(/bg-brand-600/);
    await expect(page.getByLabel('Email')).toHaveValue('new.user@oppnets.test');
    await expect(page.getByLabel('Password')).toHaveValue('');
  });

  test('simulates returning-user login and logout', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill('returning.user@oppnets.test');
    await page.getByLabel('Password').fill('OppNetsTest1!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).last().click();
    await page.getByRole('button', { name: 'Open Workspace' }).click();
    await page.locator('aside').getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page.getByRole('heading', { name: 'Opportunity Network' })).toBeVisible();
  });
});
