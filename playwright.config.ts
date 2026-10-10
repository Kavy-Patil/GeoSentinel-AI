import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: "http://localhost:8080",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 720 }
  }
});
