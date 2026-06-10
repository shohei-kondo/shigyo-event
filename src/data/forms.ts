// フォームで使う選択肢の共通定義（設計書セクション13〜16）。
import { professions } from './professions';

/** 士業・団体種別の選択肢（個別LPに無い団体も将来の流入に備えて含める） */
export const professionTypeOptions: string[] = [
  '弁護士会',
  '税理士会',
  '社労士会',
  '司法書士会',
  '行政書士会',
  '不動産鑑定士協会',
  'その他',
];

/** 予定しているイベント種別（無料相談フォーム） */
export const eventTypeOptions: string[] = [
  '研修後の懇親会',
  '支部総会後の交流会',
  '忘年会・新年会',
  '賀詞交歓会',
  '周年行事',
  'まだ決まっていない',
];

/** 想定参加人数 */
export const attendeeOptions: string[] = [
  '10名未満',
  '10〜20名',
  '20〜40名',
  '40〜60名',
  '60名以上',
  '未定',
];

/** 開催予定時期 */
export const periodOptions: string[] = [
  '1ヶ月以内',
  '1〜3ヶ月以内',
  '3〜6ヶ月以内',
  '半年以上先',
  '未定',
];

/** 相談したいこと（無料相談フォーム） */
export const consultTopicOptions: string[] = [
  '何を企画すればよいか相談したい',
  '毎年同じ内容でよいか迷っている',
  '景品やゲームのアイデアがほしい',
  '会場選びの条件を整理したい',
  '当日の流れを相談したい',
  'まず全体像を相談したい',
];

/** 無料相談の希望方法 */
export const consultMethodOptions: string[] = ['オンライン', '電話', '対面相談希望'];

/** 予算感（会場選びフォーム） */
export const budgetOptions: string[] = [
  '1人あたり5,000円未満',
  '1人あたり5,000〜7,000円',
  '1人あたり7,000〜10,000円',
  '1人あたり10,000円以上',
  '未定',
];

/** 希望形式（会場選びフォーム） */
export const venueStyleOptions: string[] = [
  '着席',
  '立食',
  '個室',
  '貸切',
  '半貸切',
  '未定',
];

/** 必要設備（会場選びフォーム） */
export const equipmentOptions: string[] = [
  'マイク',
  'プロジェクター',
  'スクリーン',
  '音響設備',
  '受付スペース',
  '控室',
  '表彰・景品置き場',
  '特になし',
];

/** 飲食の希望（会場選びフォーム） */
export const cateringOptions: string[] = [
  'コース料理',
  'ビュッフェ',
  '飲み放題あり',
  'おまかせ',
  '未定',
];

/** 入れたい進行（台本作成フォーム） */
export const programOptions: string[] = [
  '開会挨拶',
  '代表挨拶',
  '来賓挨拶',
  '乾杯',
  '歓談',
  '自己紹介',
  '表彰',
  '抽選会・ビンゴ',
  '集合写真',
  '締めの挨拶',
  '閉会案内',
];

/** 作ってほしいもの（台本作成フォーム） */
export const deliverableOptions: string[] = [
  '全体タイムテーブル',
  '司会台本',
  '幹事向け進行表',
  '役割分担表',
  '準備物リスト',
  '当日チェックリスト',
];

/** 企画・ゲームの有無（台本作成フォーム） */
export const planGameOptions: string[] = ['あり', 'なし', '検討中'];

/** 個別LPのスラッグ一覧（流入元の表示などに使用） */
export const professionSlugs: string[] = professions.map((p) => p.slug);
