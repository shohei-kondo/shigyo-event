import { expect, test } from '@playwright/test';

const paths = ['/', '/lawyer/', '/gyosei/'] as const;

for (const path of paths) {
  test(`preview ${path} renders without console errors or 404s`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const notFoundUrls: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('response', (response) => {
      if (response.status() === 404) {
        notFoundUrls.push(response.url());
      }
    });

    await page.goto(path, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.screenshot({
      path: `tests/fixtures/preview-verify${path.replace(/\//g, '-') || '-root-'}.png`,
      fullPage: true,
    });

    expect(consoleErrors, `console errors on ${path}`).toEqual([]);
    expect(notFoundUrls, `404 responses on ${path}`).toEqual([]);
  });
}
