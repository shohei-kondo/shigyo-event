// @ts-check
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { staticLpSnapshot } from './src/integrations/staticLpSnapshot';

const target = process.env.DEPLOY_TARGET ?? 'pages';

/**
 * dist/BUILD_INFO.txt を出力する（再発防止: どのターゲットでビルドしたか一目で分かる）。
 * アップロード前に BUILD_INFO.txt を開き `target: production` であることを確認する。
 */
const buildInfo = () => ({
  name: 'build-info',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const path = fileURLToPath(new URL('BUILD_INFO.txt', dir));
      const lines = [
        `target: ${target}`,
        `built_at_utc: ${new Date().toISOString()}`,
        `built_at_jst: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
        '',
      ];
      writeFileSync(path, lines.join('\n'), 'utf8');
      console.log(`[build-info] wrote BUILD_INFO.txt (target: ${target})`);
    },
  },
});

// GitHub Pages: base=/shigyo-event/
// 本番（お名前.com ルート配信）: base=/
export default defineConfig({
  integrations: [staticLpSnapshot(), buildInfo()],
  site:
    target === 'production'
      ? 'https://shigyo-event.comet-event.com'
      : 'https://shohei-kondo.github.io',
  base: target === 'production' ? '/' : '/shigyo-event/',
  trailingSlash: 'always',
});
