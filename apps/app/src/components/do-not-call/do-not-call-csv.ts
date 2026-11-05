import {
  DO_NOT_CALL_BULK_MAX_ROWS,
  DO_NOT_CALL_REASON_MAX_LENGTH,
} from "@workspace/shared/api/do-not-call/schemas"
import type { BulkAddDoNotCallRequest } from "@workspace/shared/api/do-not-call/types"
import type { TFunction } from "@/lib/i18n"

const CSV_TEMPLATE = "phone_number,reason\n+14155551234,\n"

// Reasons are free text, so unlike the recipients CSV this has to honour quoted
// commas. Excel in a Spanish locale exports with semicolons.
function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]

    if (char === '"' && quoted && line[index + 1] === '"') {
      cell += '"'
      index++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim())
      cell = ""
    } else {
      cell += char
    }
  }

  cells.push(cell.trim())
  return cells
}

export function parseDoNotCallCsv(
  text: string,
  t: TFunction
): BulkAddDoNotCallRequest["rows"] {
  const [header, ...lines] = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  if (!header || lines.length === 0) {
    throw new Error(t("components.do_not_call.csv.errors.missing_rows"))
  }

  const delimiter = !header.includes(",") && header.includes(";") ? ";" : ","
  const columns = parseCsvLine(header, delimiter).map((column) =>
    column.toLowerCase()
  )
  const numberIndex = columns.indexOf("phone_number")
  const reasonIndex = columns.indexOf("reason")

  if (numberIndex === -1) {
    throw new Error(
      t("components.do_not_call.csv.errors.missing_phone_number_column")
    )
  }

  if (lines.length > DO_NOT_CALL_BULK_MAX_ROWS) {
    throw new Error(
      t("components.do_not_call.csv.errors.too_many_rows", {
        max: DO_NOT_CALL_BULK_MAX_ROWS,
      })
    )
  }

  return lines.flatMap((line) => {
    const cells = parseCsvLine(line, delimiter)
    const number = cells[numberIndex] ?? ""
    const reason = cells[reasonIndex]?.slice(0, DO_NOT_CALL_REASON_MAX_LENGTH)

    if (!number) {
      return []
    }

    return reason ? [{ number, reason }] : [{ number }]
  })
}

export function downloadDoNotCallCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = "do-not-call-template.csv"
  anchor.click()

  URL.revokeObjectURL(url)
}
