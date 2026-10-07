import { Skeleton } from "@workspace/ui/components/skeleton"

export function SheetSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <Skeleton className="h-8 w-70 shrink-0" />
      <Skeleton className="min-h-0 flex-1" />
    </div>
  )
}
