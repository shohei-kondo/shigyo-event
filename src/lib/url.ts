// 本番ドメイン（shigyo-event.comet-event.com）ルート配信向けの内部リンク生成。
const BASE = import.meta.env.BASE_URL; // 例: '/'

/**
 * base を起点とした絶対パスを返す。
 * 例: withBase('lawyer/') => '/lawyer/'
 */
export function withBase(path = ''): string {
  const trimmed = path.replace(/^\//, '');
  return `${BASE}${trimmed}`;
}

/** フォームへのリンク（流入元クエリ付き） */
export function formLink(
  formSlug: string,
  params: { from?: string; plan?: string } = {},
): string {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.plan) search.set('plan', params.plan);
  const query = search.toString();
  return `${withBase(`forms/${formSlug}/`)}${query ? `?${query}` : ''}`;
}

/** 士業 LP 用フォームリンク一式 */
export function buildProfessionFormLinks(slug: string) {
  return {
    freeConsultation: formLink('free-consultation', { from: slug, plan: 'free' }),
    venueSupport: formLink('venue-support', { from: slug, plan: 'venue' }),
    scriptSupport: formLink('script-support', { from: slug, plan: 'script' }),
  };
}
