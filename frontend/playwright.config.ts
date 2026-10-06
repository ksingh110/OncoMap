import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3000", trace: "off", screenshot: "off", video: "off" },
  webServer: {
    command: "pnpm start --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/model",
    reuseExistingServer: false,
    env: { NEXT_PUBLIC_API_URL: "https://privacy-test.onrender.com", NEXT_TELEMETRY_DISABLED: "1" },
    timeout: 90_000,
  },
})
