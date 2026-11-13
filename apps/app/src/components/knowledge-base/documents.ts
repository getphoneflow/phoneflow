import { queryOptions } from "@tanstack/react-query"

import type { KnowledgeBaseDocumentListResponse } from "@workspace/shared/api/knowledge-base/types"
import { api } from "@/lib/api"

export function knowledgeBaseDocumentsQueryOptions() {
  return queryOptions({
    queryKey: ["knowledge-base", "documents"],
    queryFn: () =>
      api.get<KnowledgeBaseDocumentListResponse>("/knowledge-base"),
    refetchInterval: (query) =>
      query.state.data?.some((document) => document.status === "processing")
        ? 2000
        : false,
  })
}
