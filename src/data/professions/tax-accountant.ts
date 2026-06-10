import type { Profession } from './index';

// 税理士会向け（設計書セクション6・8）
export const taxAccountant: Profession = {
  slug: 'tax-accountant',
  label: '税理士会',
  professionType: '税理士会',
  title: '税理士会・支部会合の幹事業務、必要なところだけお手伝いします',
  hero: {
    headline: '税理士会・支部会合の幹事業務、必要なところだけお手伝いします',
    lead: '研修会後の懇親会、支部総会、賀詞交歓会、忘年会・新年会など。会場選び、進行台本作成、企画相談まで、持ち回り幹事の負担を軽くします。',
  },
  eventExamples: [
    '研修会後の懇親会',
    '支部総会後の交流会',
    '賀詞交歓会',
    '忘年会・新年会',
    '周年行事',
  ],
};
