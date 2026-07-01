import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { extractLawyerDom } from '../lib/extractLawyerDom';

const PRODUCTION_URL = 'https://shohei-kondo.github.io/shigyo-event/lawyer/';
const FIXTURE_DIR = join(process.cwd(), 'tests/fixtures/lawyer-baseline');

test.describe.configure({ mode: 'serial' });

test('capture lawyer baseline from GitHub Pages', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.codex-hero', { timeout: 30_000 });

  mkdirSync(FIXTURE_DIR, { recursive: true });

  const snapshot = await extractLawyerDom(page);
  writeFileSync(join(FIXTURE_DIR, 'dom-snapshot.json'), JSON.stringify(snapshot, null, 2));

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({
    path: join(FIXTURE_DIR, 'desktop.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(FIXTURE_DIR, 'mobile.png'),
    fullPage: true,
  });
});
