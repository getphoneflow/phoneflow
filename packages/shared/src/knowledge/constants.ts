export const KNOWLEDGE_BASE_COLLECTION = "knowledge_chunks"
export const KNOWLEDGE_BASE_EMBEDDING_MODEL = "text-embedding-3-small"
export const KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS = 1536
export const KNOWLEDGE_BASE_TOP_K = 3
export const MAX_KNOWLEDGE_BASE_DOCUMENT_BYTES = 50 * 1024 * 1024

export const KNOWLEDGE_BASE_DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "docm",
  "ppt",
  "pps",
  "pot",
  "pptx",
  "pptm",
  "ppsx",
  "ppsm",
  "xls",
  "xlsx",
  "xlsm",
  "xlsb",
  "odt",
  "ods",
  "odp",
  "rtf",
  "epub",
  "csv",
  "txt",
  "md",
] as const

export function knowledgeBaseDocumentExtension(fileName: string) {
  return KNOWLEDGE_BASE_DOCUMENT_EXTENSIONS.find((extension) =>
    fileName.toLowerCase().endsWith(`.${extension}`)
  )
}
