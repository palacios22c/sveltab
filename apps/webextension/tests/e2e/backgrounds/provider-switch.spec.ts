import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pom/workspace';

test.slow();
test.describe.configure({ retries: 3 });

test(`provider switch is working`, async ({ page }) => {
  await page.goto('/');
  const workspacePage = new WorkspacePage(page);

  // No need to select the provider, as Bing is the default provider

  await workspacePage.expectBackgroundImageToLoad(expect.stringContaining(encodeURIComponent('https://bing.com')));

  await Promise.all([
    workspacePage.selectBackgroundProvider('wallhaven'),
    page.waitForResponse(/(https:\/\/wallhaven.cc\/api\/)|(https%3A%2F%2Fwallhaven\.cc%2Fapi%2F)/gi),
  ]);

  await workspacePage.expectBackgroundImageToLoad(
    expect.stringContaining(encodeURIComponent('https://w.wallhaven.cc')),
  );

  await workspacePage.selectBackgroundProvider('bing-daily-image');

  await workspacePage.expectBackgroundImageToLoad(expect.stringContaining(encodeURIComponent('https://bing.com')));
});
