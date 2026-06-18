import type { Profession } from './index';

// 弁護士会向け（設計書セクション6・8）
export const lawyer: Profession = {
  slug: 'lawyer',
  label: '弁護士会',
  title: '弁護士会・支部イベントの幹事業務、必要なところだけお手伝いします',
  hero: {
    headline: '弁護士会・支部イベントの幹事業務、必要なところだけお手伝いします',
    lead: '研修後の懇親会、支部総会、忘年会・新年会、交流会など。会場選び、進行台本作成、企画相談まで、忙しい幹事様の負担を軽くします。',
  },
  eventExamples: [
    '研修後の懇親会',
    '支部総会後の交流会',
    '忘年会・新年会',
    '交流会',
    '周年行事',
  ],
};
