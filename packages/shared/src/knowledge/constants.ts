export const KNOWLEDGE_COLLECTION = "knowledge_chunks"
export const EMBEDDING_MODEL = "text-embedding-3-small"
export const EMBEDDING_DIMENSIONS = 1536
export const KNOWLEDGE_TOP_K = 3
export const MAX_KNOWLEDGE_FILE_BYTES = 50 * 1024 * 1024
export const MAX_KNOWLEDGE_TEXT_CHARS = 1_000_000

export const KNOWLEDGE_FILE_EXTENSIONS = [
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

export function knowledgeFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""
  return KNOWLEDGE_FILE_EXTENSIONS.find((candidate) => candidate === extension)
}
