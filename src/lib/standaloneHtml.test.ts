import { describe, expect, it } from 'vitest';
import { lawyer } from '../data/professions/lawyer';
import { sharoshi } from '../data/professions/sharoshi';
import { renderProfessionLp } from './standaloneHtml';

function extractCustomPayload(html: string) {
  const marker = 'const custom = ';
  const start = html.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf(';\n    document.documentElement.classList', jsonStart);
  expect(jsonEnd).toBeGreaterThan(jsonStart);
  return JSON.parse(html.slice(jsonStart, jsonEnd)) as {
    profession: {
      eyebrow: string;
      issuesTitleHtml: string;
    };
    links: Record<string, string>;
  };
}

function collectLinkHrefs(payload: { links: Record<string, string> }) {
  return Object.values(payload.links);
}

describe('renderProfessionLp', () => {
  it('includes lawyer-specific copy for lawyer slug', async () => {
    const html = await renderProfessionLp(lawyer, 'v3');
    const payload = extractCustomPayload(html);
    expect(payload.profession.eyebrow).toBe('弁護士会・支部向け');
    expect(html).toContain('300名以上をお招きする弁護士会様');
  });

  it('does not hardcode legacy /shigyo-event/ paths in injection links', async () => {
    const html = await renderProfessionLp(lawyer, 'v3');
    const payload = extractCustomPayload(html);
    for (const href of collectLinkHrefs(payload)) {
      expect(href).not.toContain('/shigyo-event/');
    }
    expect(html).toContain('/comet-logo.png');
    expect(html).not.toMatch(/\/shigyo-event\//);
  });

  it('embeds form links with from=lawyer query', async () => {
    const html = await renderProfessionLp(lawyer, 'v3');
    const payload = extractCustomPayload(html);
    expect(payload.links.freeConsultation).toContain('from=lawyer');
    expect(payload.links.freeConsultation).toContain('/forms/free-consultation/');
  });

  it('uses sharoshi-specific eyebrow and issues title in payload', async () => {
    const html = await renderProfessionLp(sharoshi, 'v3');
    const payload = extractCustomPayload(html);
    expect(payload.profession.eyebrow).toBe('社労士会・支部向け');
    expect(payload.profession.issuesTitleHtml).toContain('社労士会・支部イベントで');
    expect(payload.links.freeConsultation).toContain('from=sharoshi');
  });

  it('uses root-based asset paths', async () => {
    const html = await renderProfessionLp(lawyer, 'v3');
    expect(html).toContain('/comet-logo.png');
    expect(html).toContain('/daihon.gif');
  });

  it('unpacks bundle at build time without client-side bundler shell', async () => {
    const html = await renderProfessionLp(lawyer, 'v3');
    expect(html).not.toContain('__bundler/manifest');
    expect(html).not.toContain('__bundler_loading');
    expect(html).not.toContain('Unpacking...');
    expect(html).not.toMatch(/^<!DOCTYPE html>/i);
    expect(html.trimStart().startsWith('<html')).toBe(true);
    expect(html).not.toContain('data:font/woff2');
    expect(html).toContain('/lp-assets/');
  });
});
