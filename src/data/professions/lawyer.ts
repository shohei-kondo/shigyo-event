import type { Profession } from './index';

const DEFAULT_ABOUT_HIGHLIGHT =
  '数多くの士業団体・支部のイベントをお手伝いしてきました。';

export const lawyer: Profession = {
  slug: 'lawyer',
  label: '弁護士会',
  title: '弁護士会・支部イベントの幹事業務、必要なところだけお手伝いします',
  eyebrow: '弁護士会・支部向け',
  hero: {
    headline: '弁護士会・支部イベントの幹事業務、必要なところだけお手伝いします',
    lead: '研修後の懇親会、支部総会、忘年会・新年会。先生方同士の関係づくりや支部活動への参加意欲に関わる大切な機会ですが、 会場選び、案内、進行、当日の確認が幹事様に集中しがちです。',
  },
  issuesTitleHtml: '弁護士会・支部イベントで、<br>こんなお困りごとはありませんか？',
  heroImageAlt: '弁護士会・支部イベントの様子',
  eventExamples: [
    '研修後の懇親会',
    '支部総会後の交流会',
    '忘年会・新年会',
    '交流会',
    '周年行事',
  ],
  aboutHighlight:
    '今まで、過去に300名以上をお招きする弁護士会様のセミナー運営や、某省の大臣や国会議員をお招きしたVIP対応を含む医師会様のお集まり等、数多くの士業の皆さまのイベントをお手伝いしてきました。',
};

export { DEFAULT_ABOUT_HIGHLIGHT };
