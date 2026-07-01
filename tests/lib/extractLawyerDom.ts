export type LawyerDomSnapshot = {
  eyebrow: string;
  heroTitle: string;
  heroLead: string;
  issuesTitle: string;
  issueItems: string[];
  planGuideTitle: string;
  planRowCount: number;
  deliverablesLabel: string;
  aboutName: string;
  reasonCount: number;
  headerCtaText: string;
  headerCtaHref: string;
};

export async function extractLawyerDom(page: {
  locator: (selector: string) => {
    textContent: () => Promise<string | null>;
    getAttribute: (name: string) => Promise<string | null>;
    count: () => Promise<number>;
    nth: (index: number) => { textContent: () => Promise<string | null> };
  };
}): Promise<LawyerDomSnapshot> {
  const eyebrow = (await page.locator('.codex-hero__eyebrow').textContent()) ?? '';
  const heroTitle = (await page.locator('.codex-hero__title').textContent()) ?? '';
  const heroLead = (await page.locator('.codex-hero__lead').textContent()) ?? '';
  const issuesTitle = (await page.locator('.codex-issues__title').textContent()) ?? '';
  const issueCount = await page.locator('.codex-issue p').count();
  const issueItems: string[] = [];
  for (let i = 0; i < issueCount; i++) {
    const text = await page.locator('.codex-issue p').nth(i).textContent();
    if (text) issueItems.push(text.replace(/\s+/g, ' ').trim());
  }
  const planGuideTitle = (await page.locator('.codex-plan__title').textContent()) ?? '';
  const planRowCount = await page.locator('.codex-plan-row').count();
  const deliverablesLabel = (await page.locator('.codex-deliverables .codex-section-label').textContent()) ?? '';
  const aboutName = (await page.locator('.codex-about-name').textContent()) ?? '';
  const reasonCount = await page.locator('.codex-reason-card').count();
  const headerCtaText = (await page.locator('.codex-site-header__cta').textContent()) ?? '';
  const headerCtaHref = (await page.locator('.codex-site-header__cta').getAttribute('href')) ?? '';

  return {
    eyebrow: eyebrow.replace(/\s+/g, ' ').trim(),
    heroTitle: heroTitle.replace(/\s+/g, ' ').trim(),
    heroLead: heroLead.replace(/\s+/g, ' ').trim(),
    issuesTitle: issuesTitle.replace(/\s+/g, ' ').trim(),
    issueItems,
    planGuideTitle: planGuideTitle.replace(/\s+/g, ' ').trim(),
    planRowCount,
    deliverablesLabel: deliverablesLabel.replace(/\s+/g, ' ').trim(),
    aboutName: aboutName.replace(/\s+/g, ' ').trim(),
    reasonCount,
    headerCtaText: headerCtaText.replace(/\s+/g, ' ').trim(),
    headerCtaHref,
  };
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeHrefForCompare(href: string): string {
  try {
    const url = new URL(href, 'https://example.com');
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}
