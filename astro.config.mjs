// @ts-check
import { defineConfig } from 'astro/config';
import { staticLpSnapshot } from './src/integrations/staticLpSnapshot';

const target = process.env.DEPLOY_TARGET ?? 'pages';

// GitHub Pages: base=/shigyo-event/
// 本番（お名前.com ルート配信）: base=/
export default defineConfig({
  integrations: [staticLpSnapshot()],
  site:
    target === 'production'
      ? 'https://shigyo-event.comet-event.com'
      : 'https://shohei-kondo.github.io',
  base: target === 'production' ? '/' : '/shigyo-event/',
  trailingSlash: 'always',
});
