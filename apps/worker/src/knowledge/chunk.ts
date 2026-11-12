const TARGET_CHARS = 3200
const OVERLAP_CHARS = 400

function splitOversized(section: string) {
  const chunks: string[] = []
  let current = ""

  for (const paragraph of section.split(/\n{2,}/)) {
    if (paragraph.length > TARGET_CHARS) {
      if (current.trim()) chunks.push(current.trim())
      current = ""
      const step = TARGET_CHARS - OVERLAP_CHARS
      for (let index = 0; index < paragraph.length; index += step) {
        const piece = paragraph.slice(index, index + TARGET_CHARS).trim()
        if (piece) chunks.push(piece)
      }
      continue
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph
    if (next.length > TARGET_CHARS && current.trim()) {
      chunks.push(current.trim())
      current = paragraph
    } else {
      current = next
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export function chunkMarkdown(markdown: string) {
  const normalized = markdown.replaceAll("\r\n", "\n").trim()
  if (!normalized) return []

  const chunks: string[] = []
  let current = ""

  const pushCurrent = () => {
    const trimmed = current.trim()
    if (trimmed) chunks.push(trimmed)
    current = ""
  }

  for (const section of normalized.split(/\n(?=#{1,6} )/)) {
    const trimmed = section.trim()
    if (!trimmed) continue

    if (trimmed.length > TARGET_CHARS) {
      pushCurrent()
      chunks.push(...splitOversized(trimmed))
      continue
    }

    const next = current ? `${current}\n\n${trimmed}` : trimmed
    if (next.length > TARGET_CHARS) {
      const overlap = current.slice(-OVERLAP_CHARS).trim()
      pushCurrent()
      current = overlap ? `${overlap}\n\n${trimmed}` : trimmed
    } else {
      current = next
    }
  }

  pushCurrent()
  return chunks
}
