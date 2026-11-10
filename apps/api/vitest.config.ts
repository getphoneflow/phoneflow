import { fileURLToPath } from "node:url"
import { defineProject } from "vitest/config"

export default defineProject({
  resolve: { tsconfigPaths: true },
  test: {
    name: "api",
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: {
      DOTENV_CONFIG_PATH: fileURLToPath(
        new URL("./.env.test", import.meta.url)
      ),
      DOTENV_CONFIG_QUIET: "true",
    },
    setupFiles: ["src/tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
