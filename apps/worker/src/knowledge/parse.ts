import {
  type Format,
  formatFromExtension,
  type NeedsOcrError,
  toMarkdownBytes,
} from "@firecrawl/anydoc"

const PLAIN_TEXT = new Set(["txt", "md", "markdown"])

export class PermanentParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PermanentParseError"
  }
}

function extensionOf(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? ""
}

function convertCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    return String(error.code)
  }
  return ""
}

export async function documentToMarkdown(bytes: Uint8Array, fileName: string) {
  const extension = extensionOf(fileName)
  if (PLAIN_TEXT.has(extension)) {
    return new TextDecoder().decode(bytes)
  }

  const format = formatFromExtension(extension) as Format | null

  try {
    return await toMarkdownBytes(bytes, format)
  } catch (error) {
    const code = convertCode(error)
    if (code === "needsOcr") {
      const pages = (error as NeedsOcrError).pages ?? []
      const pageLabel = pages.length ? ` (pages ${pages.join(", ")})` : ""
      throw new PermanentParseError(
        `This document needs OCR${pageLabel}, which is not supported.`
      )
    }
    if (
      code === "unsupported" ||
      code === "malformed" ||
      code === "encrypted" ||
      code === "missingPart" ||
      code === "resourceLimit"
    ) {
      throw new PermanentParseError(`Could not read this document (${code}).`)
    }
    throw error
  }
}
