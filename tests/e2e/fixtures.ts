import { test as base, expect, type Page, type TestInfo } from '@playwright/test';

const E2E_AUTH_STORAGE_KEY = 'oppnets:e2e-authenticated';
const transparentSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2" viewBox="0 0 2 2"><rect width="2" height="2" fill="#eef2ff"/></svg>';

async function stubNonProductionServices(page: Page) {
  await page.route('https://example.supabase.co/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '*/0' },
      body: '[]',
    });
  });

  await page.route('https://images.pexels.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: transparentSvg });
  });
}

function watchRuntimeHealth(page: Page, testInfo: TestInfo) {
  const failures: string[] = [];

  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location();
      const source = location.url ? ` at ${location.url}:${location.lineNumber}` : '';
      failures.push(`console: ${message.text()}${source}`);
    }
  });
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    const resourceType = request.resourceType();
    if (url.origin === 'http://127.0.0.1:4173' && ['document', 'script', 'stylesheet', 'image', 'font'].includes(resourceType)) {
      failures.push(`requestfailed: ${resourceType} ${url.pathname} (${request.failure()?.errorText ?? 'unknown'})`);
    }
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    const resourceType = response.request().resourceType();
    if (url.origin === 'http://127.0.0.1:4173' && response.status() >= 400 && ['document', 'script', 'stylesheet', 'image', 'font'].includes(resourceType)) {
      failures.push(`http ${response.status()}: ${resourceType} ${url.pathname}`);
    }
  });

  return async () => {
    if (failures.length > 0) {
      await testInfo.attach('runtime-health.json', {
        body: JSON.stringify({ failures }, null, 2),
        contentType: 'application/json',
      });
    }
    expect(failures, 'The page must not emit JavaScript, console, asset, or same-origin request failures').toEqual([]);
  };
}

type OppNetsFixtures = {
  authenticatedPage: Page;
  assertNoHorizontalOverflow: (page: Page) => Promise<void>;
  assertVisibleImagesLoaded: (page: Page) => Promise<void>;
};

export const test = base.extend<OppNetsFixtures>({
  page: async ({ page }, use, testInfo) => {
    await stubNonProductionServices(page);
    const assertRuntimeHealth = watchRuntimeHealth(page, testInfo);
    await use(page);
    await assertRuntimeHealth();
  },

  authenticatedPage: async ({ page }, use) => {
    await page.addInitScript((key) => window.localStorage.setItem(key, 'true'), E2E_AUTH_STORAGE_KEY);
    await use(page);
  },

  assertNoHorizontalOverflow: async ({}, use) => {
    await use(async (page) => {
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, 'The page should not require horizontal scrolling').toBeLessThanOrEqual(dimensions.clientWidth + 1);
    });
  },

  assertVisibleImagesLoaded: async ({}, use) => {
    await use(async (page) => {
      const brokenImages = await page.locator('img:visible').evaluateAll((images) => images
        .filter((image) => !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0)
        .map((image) => ({ src: (image as HTMLImageElement).src, alt: (image as HTMLImageElement).alt })));
      expect(brokenImages, 'Every visible image should finish loading').toEqual([]);
    });
  },
});

export { expect };

export async function enterApp(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Every connection should lead to an opportunity.' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
}
