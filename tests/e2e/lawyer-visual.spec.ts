import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { extractLawyerDom, normalizeHrefForCompare, normalizeText } from '../lib/extractLawyerDom';

const baseline = JSON.parse(
  readFileSync(
    join(process.cwd(), 'tests/fixtures/lawyer-baseline/dom-snapshot.json'),
    'utf8',
  ),
);

test.describe('lawyer LP visual parity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lawyer/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.codex-hero', { timeout: 30_000 });
  });

  test('matches baseline DOM structure and copy', async ({ page }) => {
    const snapshot = await extractLawyerDom(page);

    expect(snapshot.eyebrow).toBe(baseline.eyebrow);
    expect(snapshot.heroTitle).toContain('持ち回りの幹事業務');
    expect(snapshot.heroTitle).toContain('なんとなく例年通り');
    expect(normalizeText(snapshot.heroLead)).toContain('幹事様に集中しがちです');
    expect(snapshot.issuesTitle).toContain('弁護士会・支部イベントで');
    expect(snapshot.issueItems).toEqual(baseline.issueItems);
    expect(snapshot.planRowCount).toBe(baseline.planRowCount);
    expect(snapshot.deliverablesLabel).toBe(baseline.deliverablesLabel);
    expect(normalizeText(snapshot.aboutName)).toBe(normalizeText(baseline.aboutName));
    expect(snapshot.reasonCount).toBe(baseline.reasonCount);
    expect(snapshot.headerCtaText).toBe(baseline.headerCtaText);

    const href = normalizeHrefForCompare(snapshot.headerCtaHref);
    expect(href).toContain('/forms/free-consultation/');
    expect(href).toContain('from=lawyer');
    expect(href).not.toContain('/shigyo-event/');
  });

  test('desktop screenshot matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page).toHaveScreenshot('desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.15,
    });
  });

  test('mobile screenshot matches baseline layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page).toHaveScreenshot('mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.18,
    });
  });
});
