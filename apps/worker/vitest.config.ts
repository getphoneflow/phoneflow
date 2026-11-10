import { fileURLToPath } from "node:url"
import { defineProject } from "vitest/config"

export default defineProject({
  resolve: { tsconfigPaths: true },
  test: {
    name: "worker",
    include: ["src/**/*.test.ts"],
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    env: {
      DOTENV_CONFIG_PATH: fileURLToPath(
        new URL("./.env.test", import.meta.url)
      ),
      DOTENV_CONFIG_QUIET: "true",
    },
  },
})
