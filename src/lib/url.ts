// base パス（/shigyo-event/）を考慮した内部リンク生成ヘルパー。
const BASE = import.meta.env.BASE_URL; // 例: '/shigyo-event/'

/**
 * base を起点とした絶対パスを返す。
 * 例: withBase('lawyer/') => '/shigyo-event/lawyer/'
 */
export function withBase(path = ''): string {
  const trimmed = path.replace(/^\//, '');
  return `${BASE}${trimmed}`;
}

/** フォームへのリンク（流入元クエリ付き） */
export function formLink(
  formSlug: string,
  params: { from?: string; plan?: string } = {}
): string {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.plan) search.set('plan', params.plan);
  const query = search.toString();
  return `${withBase(`forms/${formSlug}/`)}${query ? `?${query}` : ''}`;
}
