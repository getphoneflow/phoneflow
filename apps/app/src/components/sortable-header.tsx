import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

type SortableColumn = {
  getIsSorted: () => false | "asc" | "desc"
  toggleSorting: (desc?: boolean) => void
}

export function SortableHeader({
  column,
  title,
}: {
  column: SortableColumn
  title: string
}) {
  const sorted = column.getIsSorted()

  return (
    <button
      type="button"
      className="flex cursor-pointer items-center gap-2 select-none"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp className="size-4" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-4" />
      ) : (
        <ChevronsUpDown className="size-4" />
      )}
    </button>
  )
}
