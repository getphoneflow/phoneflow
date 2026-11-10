import { defineProject } from "vitest/config"

export default defineProject({
  resolve: { tsconfigPaths: true },
  test: {
    name: "shared",
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
})
