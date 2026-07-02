import { defineConfig, devices } from '@playwright/test';

const previewPort = 4321;
const previewBase = `http://127.0.0.1:${previewPort}`;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'preview-verify.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
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
    command: 'npm run preview:prod',
    url: previewBase,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
