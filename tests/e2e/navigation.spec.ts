import { test, expect, enterApp } from './fixtures';

const destinations = [
  ['Home', 'Home'],
  ['Discover Opportunities', 'Discover Opportunities'],
  ['People and Teams', 'People and Teams'],
  ['My Opportunities', 'My Opportunities'],
  ['Collaboration Spaces', 'East Austin Bungalow Flip'],
  ['Messages', 'Messages'],
  ['Notifications', 'Notifications'],
  ['Profile', 'You (Demo User)'],
  ['Trust Center', 'Trust Center'],
  ['Professionals', 'Professional Marketplace'],
  ['Companies', 'Company Directory'],
  ['Builder Partners', 'Builder Resources'],
  ['Success Stories', 'Example Success Stories'],
  ['Resource Center', 'Resource Center'],
  ['Pricing', 'Pricing'],
  ['Settings', 'Settings'],
] as const;

test.describe('desktop navigation bot', () => {
  test('opens every primary destination and renders its main heading', async ({ authenticatedPage: page, assertVisibleImagesLoaded }) => {
    test.setTimeout(60_000);
    await enterApp(page);
    const sidebar = page.locator('aside').first();

    for (const [navigationLabel, heading] of destinations) {
      await sidebar.getByRole('button', { name: navigationLabel }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true }).first(), `${navigationLabel} should render`).toBeVisible();
      await assertVisibleImagesLoaded(page);
    }
  });

  test('supports core discovery, settings, notification, and messaging interactions', async ({ authenticatedPage: page }) => {
    await enterApp(page);
    const sidebar = page.locator('aside').first();

    await sidebar.getByRole('button', { name: 'Discover Opportunities' }).click();
    await page.getByPlaceholder('Search by title, description, or skill...').fill('no-such-opportunity-123');
    await expect(page.getByRole('heading', { name: 'No opportunities match' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByText(/opportunities$/).first()).toBeVisible();

    await sidebar.getByRole('button', { name: 'Notifications' }).click();
    await page.getByRole('button', { name: 'Mark all read' }).click();
    await expect(page.getByText('0 unread').first()).toBeVisible();

    await sidebar.getByRole('button', { name: 'Messages' }).click();
    const message = `Automated check ${Date.now()}`;
    await page.getByPlaceholder('Type a message...').fill(message);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('div').filter({ hasText: new RegExp(`^${message}$`) }).last()).toBeVisible();

    await sidebar.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Name').fill('Automated OppNets Tester');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toHaveText('Account name saved.');
  });
});
