import { defineConfig, devices } from '@playwright/test';

/** GitHub Pages から基準画像を取得する専用設定（webServer 不要） */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'capture-baseline.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  snapshotPathTemplate: '{testDir}/../fixtures/lawyer-baseline/{arg}{ext}',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
