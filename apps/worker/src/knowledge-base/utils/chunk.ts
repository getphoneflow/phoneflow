const maxChars = 3200

export function chunkMarkdown(markdown: string) {
  const chunks: string[] = []
  let current = ""

  for (const paragraph of markdown
    .replaceAll("\r\n", "\n")
    .trim()
    .split(/\n{2,}/)) {
    const text = paragraph.trim()
    if (!text) continue

    if (text.length > maxChars) {
      if (current) chunks.push(current)
      current = ""
      for (let index = 0; index < text.length; index += maxChars) {
        chunks.push(text.slice(index, index + maxChars))
      }
      continue
    }

    const next = current ? `${current}\n\n${text}` : text
    if (current && next.length > maxChars) {
      chunks.push(current)
      current = text
    } else {
      current = next
    }
  }

  if (current) chunks.push(current)
  return chunks
}
