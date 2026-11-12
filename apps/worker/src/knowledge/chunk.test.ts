import { describe, expect, it } from "vitest"

import { chunkMarkdown } from "./chunk"

describe("chunkMarkdown", () => {
  it("keeps a short document in one chunk", () => {
    expect(chunkMarkdown("# Hours\n\nOpen 9 to 5.")).toEqual([
      "# Hours\n\nOpen 9 to 5.",
    ])
  })

  it("splits on headings and overlaps the previous section", () => {
    const first = `# One\n\n${"a".repeat(2000)}`
    const second = `# Two\n\n${"b".repeat(2000)}`
    const chunks = chunkMarkdown(`${first}\n${second}`)

    expect(chunks).toHaveLength(2)
    expect(chunks[0]?.startsWith("# One")).toBe(true)
    expect(chunks[1]?.startsWith("# Two")).toBe(false)
    expect(chunks[1]).toContain("# Two")
  })

  it("returns nothing for blank text", () => {
    expect(chunkMarkdown("  \n")).toEqual([])
  })
})
