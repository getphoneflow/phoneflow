import { defineProject } from "vitest/config"

export default defineProject({
  resolve: { tsconfigPaths: true },
  test: {
    name: "app",
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
})
