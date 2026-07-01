import { expect, test } from '@playwright/test';
import { professions } from '../../src/data/professions';
import { normalizeText } from '../lib/extractLawyerDom';

const expansionTargets = professions.filter((p) => p.slug !== 'lawyer');

for (const profession of expansionTargets) {
  test.describe(`${profession.slug} LP`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${profession.slug}/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.codex-hero', { timeout: 30_000 });
    });

    test('shows profession-specific eyebrow and issues title', async ({ page }) => {
      await expect(page.locator('.codex-hero__eyebrow')).toHaveText(profession.eyebrow);
      const issuesTitle = normalizeText(
        (await page.locator('.codex-issues__title').textContent()) ?? '',
      );
      const expectedLine = normalizeText(
        profession.issuesTitleHtml.replace(/<br\s*\/?>/gi, ' '),
      );
      expect(issuesTitle).toContain(expectedLine.split('、')[0]);
      expect(issuesTitle).toContain('こんなお困りごとはありませんか');
    });

    test('links forms with correct from slug', async ({ page }) => {
      const href = await page.locator('.codex-site-header__cta').getAttribute('href');
      expect(href).toContain(`from=${profession.slug}`);
      expect(href).toContain('/forms/free-consultation/');
      expect(href).not.toContain('/shigyo-event/');
    });

    test('uses v3 standalone layout sections', async ({ page }) => {
      await expect(page.locator('.codex-plan-guide')).toBeVisible();
      await expect(page.locator('.codex-deliverables')).toBeVisible();
      await expect(page.locator('.codex-company-about')).toBeVisible();
    });
  });
}
