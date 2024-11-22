import { Backgrounds } from '$backgrounds';
import { test, expect } from '@playwright/test';

test('sets background image', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btnMainMenu').click();
  await page.locator('#aiBackgroundCatalog').click();
  const providerIndex = Backgrounds.findIndex(b => b.settings.type === 'nasa-apod');
  await Promise.all([
    page.selectOption('#cbxBackgroundType', providerIndex.toString()),
    page.waitForResponse(/https:\/\/api\.nasa\.gov\/planetary\/apod/gi),
  ]);

  const imgBackgroundLocator = page.locator('#imgBackground[src]');
  await imgBackgroundLocator.waitFor({ state: 'visible' });
  await expect(imgBackgroundLocator).toHaveAttribute(
    'src',
    expect.stringContaining(encodeURIComponent('https://apod.nasa.gov/apod/image/')),
  );
  await expect(imgBackgroundLocator).toHaveJSProperty('complete', true);
  await expect(imgBackgroundLocator).not.toHaveJSProperty('naturalWidth', 0);
});
