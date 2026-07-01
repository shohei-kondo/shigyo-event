import { defineConfig, devices } from '@playwright/test';

const previewPort = 4321;
const previewBase = `http://127.0.0.1:${previewPort}`;

export default defineConfig({
  testDir: 'tests/e2e',
  testIgnore: ['**/capture-baseline.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  snapshotPathTemplate: '{testDir}/../fixtures/lawyer-baseline/{arg}{ext}',
  use: {
    trace: 'on-first-retry',
    baseURL: previewBase,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4321',
    url: previewBase,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
