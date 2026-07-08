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
      execSync('npm run build:pages', { stdio: 'pipe', timeout: 120_000 });

      for (const slug of professionSlugs) {
        expect(existsSync(join(DIST, slug, 'index.html'))).toBe(true);
      }

      for (const form of ['free-consultation', 'venue-support', 'script-support']) {
        expect(existsSync(join(DIST, 'forms', form, 'index.html'))).toBe(true);
      }
    },
    300_000,
  );

  it('marks gateway page as noindex', () => {
    const gateway = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(gateway).toContain('noindex');
  });

  it('uses Pages base paths in gateway HTML', () => {
    const gateway = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(gateway).toContain('/shigyo-event/');
  });

  it('does not emit client-side bundler shell in profession HTML', () => {
    for (const slug of professionSlugs) {
      const html = readFileSync(join(DIST, slug, 'index.html'), 'utf8');
      expect(html).not.toContain('__bundler/manifest');
      expect(html).not.toContain('Unpacking...');
    }
  });

  it('staticizes lawyer deliverables without old copy or runtime scripts', () => {
    const html = readFileSync(join(DIST, 'lawyer', 'index.html'), 'utf8');
    expect(html).not.toContain('司会台本（Wordファイル）');
    expect(html).toContain('進行台本');
    expect(html).toContain('幹事メモ');
    expect(html).toContain('会場ご提案資料');
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toContain('unpkg.com');
  });
});
