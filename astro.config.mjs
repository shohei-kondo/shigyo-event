// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages のプロジェクトページで配信する前提。
// リポジトリ名を `shigyo-event` にすることで、公開URLが
// https://<user>.github.io/shigyo-event/... となり、設計書のURL構造と一致する。
// `site` は実際の GitHub ユーザー名 / Organization 名に置き換えること。
export default defineConfig({
  site: 'https://shohei-kondo.github.io',
  base: '/shigyo-event/',
  trailingSlash: 'always',
});
