import { test, expect, enterApp } from './fixtures';

async function openMobileDestination(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const dialog = page.getByRole('dialog', { name: 'Navigation' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name }).click();
  await expect(dialog).toBeHidden();
}

test.describe('mobile visitor bot', () => {
  test('uses the mobile menu and People/Teams filter without horizontal overflow', async ({ authenticatedPage: page, assertNoHorizontalOverflow, assertVisibleImagesLoaded }) => {
    await enterApp(page);
    await assertNoHorizontalOverflow(page);

    await openMobileDestination(page, 'People and Teams');
    await expect(page.getByRole('heading', { name: 'People and Teams' })).toBeVisible();
    await page.getByLabel('People and team type').selectOption('pair');
    await expect(page.getByRole('heading', { name: 'Frequent pairs' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('frequent pairs');
    await expect(page.getByText('Frequent collaborator pair').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Individuals' })).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await assertVisibleImagesLoaded(page);

    const menuButton = page.getByRole('button', { name: 'Open navigation' });
    const box = await menuButton.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('opens a message thread, sends a message, and returns to the conversation list', async ({ authenticatedPage: page, assertNoHorizontalOverflow }) => {
    await enterApp(page);
    await openMobileDestination(page, 'Messages');

    const conversation = page.getByRole('button', { name: /East Austin|Fintech|Coastlines|Bright/ }).first();
    await conversation.click();
    await expect(page.getByRole('button', { name: 'Back to conversations' })).toBeVisible();

    await page.getByPlaceholder('Type a message...').fill('Mobile automated message');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('div').filter({ hasText: /^Mobile automated message$/ }).last()).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Back to conversations' }).click();
    await expect(conversation).toBeVisible();
  });

  test('keeps notifications and create-opportunity controls inside the viewport', async ({ authenticatedPage: page, assertNoHorizontalOverflow }) => {
    await enterApp(page);

    await openMobileDestination(page, 'Notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Open navigation' }).click();
    const dialog = page.getByRole('dialog', { name: 'Navigation' });
    await dialog.getByRole('button', { name: 'New Opportunity' }).click();
    await expect(page.getByRole('heading', { name: 'Create an Opportunity' })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
