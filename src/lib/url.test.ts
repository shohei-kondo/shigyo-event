import { describe, expect, it } from 'vitest';
import { buildProfessionFormLinks, formLink, withBase } from './url';

describe('withBase', () => {
  it('returns root-based paths without /shigyo-event/', () => {
    expect(withBase('lawyer/')).toBe('/lawyer/');
    expect(withBase()).toBe('/');
  });

  it('does not include legacy base path', () => {
    expect(withBase('comet-logo.png')).not.toContain('/shigyo-event/');
  });
});

describe('formLink', () => {
  it('builds form URL with from and plan query params', () => {
    expect(formLink('free-consultation', { from: 'lawyer', plan: 'free' })).toBe(
      '/forms/free-consultation/?from=lawyer&plan=free',
    );
  });

  it('omits query when params are empty', () => {
    expect(formLink('venue-support')).toBe('/forms/venue-support/');
  });
});

describe('buildProfessionFormLinks', () => {
  it('includes slug in all consultation links', () => {
    const links = buildProfessionFormLinks('sharoshi');
    expect(links.freeConsultation).toContain('from=sharoshi');
    expect(links.venueSupport).toContain('from=sharoshi');
    expect(links.scriptSupport).toContain('from=sharoshi');
    expect(links.freeConsultation).not.toContain('/shigyo-event/');
  });
});
