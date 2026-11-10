import { defineProject } from "vitest/config"

export default defineProject({
  resolve: { tsconfigPaths: true },
  test: {
    name: "i18n",
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
})
