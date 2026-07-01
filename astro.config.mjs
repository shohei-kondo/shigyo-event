// @ts-check
import { defineConfig } from 'astro/config';

// 本番: https://shigyo-event.comet-event.com/（お名前.com サブドメイン・ルート配信）
export default defineConfig({
  site: 'https://shigyo-event.comet-event.com',
  base: '/',
  trailingSlash: 'always',
});
