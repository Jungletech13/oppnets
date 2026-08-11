import { test, expect, enterApp } from './fixtures';

test.describe('People and Teams regression bot', () => {
  test('changes the visible results for every group-type selection', async ({ authenticatedPage: page }) => {
    await enterApp(page);
    await page.locator('aside').getByRole('button', { name: 'People and Teams' }).click();
    const type = page.getByLabel('People and team type');

    await type.selectOption('individual');
    await expect(page.getByRole('heading', { name: 'Individuals' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Collaboration groups' })).toBeHidden();

    await type.selectOption('pair');
    await expect(page.getByRole('heading', { name: 'Individuals' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Collaboration groups' })).toBeVisible();
    await expect(page.getByText('Frequent collaborator pair').first()).toBeVisible();

    await type.selectOption('group');
    await expect(page.getByText('Established collaboration group').first()).toBeVisible();
    await expect(page.getByText('Frequent collaborator pair')).toHaveCount(0);

    await type.selectOption('team');
    await expect(page.getByText('User-created team', { exact: true })).toBeVisible();
    await expect(page.getByText('Established collaboration group')).toHaveCount(0);

    await type.selectOption('');
    await expect(page.getByRole('heading', { name: 'Individuals' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Collaboration groups' })).toBeVisible();
  });

  test('filters by search and verified status without stale results', async ({ authenticatedPage: page }) => {
    await enterApp(page);
    await page.locator('aside').getByRole('button', { name: 'People and Teams' }).click();

    await page.getByPlaceholder('Search by name, skill, or industry...').fill('Maya Chen');
    await expect(page.getByRole('heading', { name: 'Maya Chen' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Jordan Reyes' })).toBeHidden();

    const verified = page.getByRole('button', { name: 'Verified' });
    await verified.click();
    await expect(verified).toHaveAttribute('aria-pressed', 'true');
  });
});
