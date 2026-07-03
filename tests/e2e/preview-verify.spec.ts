import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  LP_NEW_DELIVERABLE_TEXTS,
  LP_OLD_DELIVERABLE_TEXT,
} from '../../src/lib/staticLpSnapshot';

const paths = ['/', '/lawyer/', '/gyosei/'] as const;
const distLawyerHtml = join(process.cwd(), 'dist', 'lawyer', 'index.html');

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

test('dist/lawyer/index.html has no old deliverable copy', () => {
  const html = readFileSync(distLawyerHtml, 'utf8');
  const matches = html.match(new RegExp(LP_OLD_DELIVERABLE_TEXT, 'g')) ?? [];
  expect(matches.length).toBe(0);
});

test('preview /lawyer/ shows new deliverables and hides old copy', async ({ page }) => {
  await page.goto('/lawyer/', { waitUntil: 'networkidle', timeout: 120_000 });

  for (const text of LP_NEW_DELIVERABLE_TEXTS) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  }
  await expect(page.getByText(LP_OLD_DELIVERABLE_TEXT)).toHaveCount(0);
});

test('preview /lawyer/ does not request external CDNs', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('unpkg.com') || url.includes('cdn.jsdelivr.net')) {
      externalRequests.push(url);
    }
  });

  await page.goto('/lawyer/', { waitUntil: 'networkidle', timeout: 120_000 });
  expect(externalRequests, 'external CDN requests on /lawyer/').toEqual([]);
});

test('preview /lawyer/ renders new deliverables with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto('/lawyer/', { waitUntil: 'domcontentloaded', timeout: 120_000 });

  for (const text of LP_NEW_DELIVERABLE_TEXTS) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  }
  await expect(page.getByText(LP_OLD_DELIVERABLE_TEXT)).toHaveCount(0);

  await context.close();
});
