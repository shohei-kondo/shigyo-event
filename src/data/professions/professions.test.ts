import { describe, expect, it } from 'vitest';
import { professions, professionSlugs } from './index';

const REQUIRED_FIELDS = [
  'slug',
  'label',
  'title',
  'eyebrow',
  'issuesTitleHtml',
  'heroImageAlt',
] as const;

describe('professions', () => {
  it('contains exactly 5 professions', () => {
    expect(professions).toHaveLength(5);
  });

  it('has expected slugs including shortened paths', () => {
    expect(professionSlugs).toEqual([
      'lawyer',
      'tax-accountant',
      'sharoshi',
      'gyosei',
      'fudosan-kantei',
    ]);
  });

  it.each(professions.map((p) => [p.slug, p] as const))(
    '%s has required fields and hero copy',
    (_slug, profession) => {
      for (const field of REQUIRED_FIELDS) {
        expect(profession[field], `${field} missing`).toBeTruthy();
      }
      expect(profession.hero.headline).toBeTruthy();
      expect(profession.hero.lead).toBeTruthy();
      expect(profession.eventExamples.length).toBeGreaterThan(0);
    },
  );

  it('uses short slugs for 社労士・行政書士・不動産鑑定士', () => {
    expect(professionSlugs).toContain('sharoshi');
    expect(professionSlugs).toContain('gyosei');
    expect(professionSlugs).toContain('fudosan-kantei');
  });
});
