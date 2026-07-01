import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { professionSlugs } from '../../src/data/professions';

const DIST = join(process.cwd(), 'dist');

describe('astro build output', () => {
  it(
    'builds all profession and form routes',
    () => {
      execSync('npm run build', { stdio: 'pipe', timeout: 120_000 });

      for (const slug of professionSlugs) {
        expect(existsSync(join(DIST, slug, 'index.html'))).toBe(true);
      }

      for (const form of ['free-consultation', 'venue-support', 'script-support']) {
        expect(existsSync(join(DIST, 'forms', form, 'index.html'))).toBe(true);
      }
    },
    180_000,
  );

  it('marks gateway page as noindex', () => {
    const gateway = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(gateway).toContain('noindex');
  });

  it('does not emit legacy /shigyo-event/ paths in HTML', () => {
    for (const slug of professionSlugs) {
      const html = readFileSync(join(DIST, slug, 'index.html'), 'utf8');
      expect(html).not.toContain('/shigyo-event/');
      expect(html).not.toContain('__bundler/manifest');
      expect(html).not.toContain('Unpacking...');
    }
  });
});
