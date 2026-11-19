import { defineConfig } from "@playwright/test";

// `npm run test:e2e` boots all three apps (or reuses ones already running).
// Meteor's first start downloads packages and builds, hence the long timeout.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: "npm --prefix apps/remote-widgets run dev",
      url: "http://localhost:3030/mf-manifest.json",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm --prefix apps/meteor-remote start",
      url: "http://localhost:4000",
      reuseExistingServer: true,
      timeout: 600_000,
    },
    {
      command: "npm --prefix apps/meteor-host start",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 600_000,
    },
  ],
});
