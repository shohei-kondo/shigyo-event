// 士業別LPのデータ定義。
// 横展開（設計書セクション6）の際は、このフォルダに同型のデータファイルを追加し、
// 下の professions に登録するだけで新しい個別LPが生成される。

export interface Profession {
  /** URLスラッグ（例: lawyer） */
  slug: string;
  /** 団体種別の表示名（例: 弁護士会） */
  label: string;
  /** フォームの「士業・団体種別」初期値として渡す値 */
  professionType: string;
  /** LP・metaタイトル */
  title: string;
  /** ファーストビュー */
  hero: {
    headline: string;
    lead: string;
  };
  /** 利用シーン見出しに添えるイベント例 */
  eventExamples: string[];
}

import { lawyer } from './lawyer';
import { taxAccountant } from './tax-accountant';

export const professions: Profession[] = [lawyer, taxAccountant];

export function getProfession(slug: string): Profession | undefined {
  return professions.find((p) => p.slug === slug);
}
