// 士業別LPのデータ定義。
// 横展開の際は、このフォルダに同型のデータファイルを追加し、
// professions に登録するだけで新しい個別LPが生成される。

export interface Profession {
  /** URLスラッグ（例: lawyer） */
  slug: string;
  /** 団体種別の表示名（例: 弁護士会） */
  label: string;
  /** LP・metaタイトル */
  title: string;
  /** ヒーロー上のラベル（例: 弁護士会・支部向け） */
  eyebrow: string;
  /** ファーストビュー */
  hero: {
    headline: string;
    lead: string;
  };
  /** COMMON ISSUES 見出し（HTML可・<br> 含む） */
  issuesTitleHtml: string;
  /** ヒーロー画像の alt */
  heroImageAlt: string;
  /** 利用シーン見出しに添えるイベント例 */
  eventExamples: string[];
  /** ABOUT セクションの実績文（省略時は共通文） */
  aboutHighlight?: string;
}

import { lawyer } from './lawyer';
import { taxAccountant } from './tax-accountant';
import { sharoshi } from './sharoshi';
import { gyosei } from './gyosei';
import { fudosanKantei } from './fudosan-kantei';

export const professions: Profession[] = [
  lawyer,
  taxAccountant,
  sharoshi,
  gyosei,
  fudosanKantei,
];

export const professionSlugs = professions.map((p) => p.slug);

export function getProfession(slug: string): Profession | undefined {
  return professions.find((p) => p.slug === slug);
}
