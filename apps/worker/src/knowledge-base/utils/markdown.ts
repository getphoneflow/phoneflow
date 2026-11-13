import { formatFromExtension, toMarkdownBytes } from "@firecrawl/anydoc"

const textExtensions = new Set(["txt", "md", "markdown"])

function extensionFromFilename(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? ""
}

export async function documentToMarkdown(bytes: Uint8Array, fileName: string) {
  const extension = extensionFromFilename(fileName)

  if (textExtensions.has(extension)) {
    return new TextDecoder().decode(bytes)
  }

  const format = formatFromExtension(extension)
  return toMarkdownBytes(bytes, format)
}
