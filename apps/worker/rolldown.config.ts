import { defineConfig } from "rolldown"

export default defineConfig({
  platform: "node",
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "esm",
    preserveModules: true,
  },
  external(id: string) {
    if (id.startsWith("@workspace/")) return false
    if (id.startsWith("@/")) return false
    if (id.startsWith(".")) return false
    if (id.startsWith("/")) return false
    return true
  },
})
