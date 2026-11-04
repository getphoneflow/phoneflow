import type { BatchCallRecipientInput } from "@workspace/shared/api/batch-calls/types"
import type { TFunction } from "@/lib/i18n"

export type ParsedCsvRecipient = BatchCallRecipientInput

const E164_REGEX = /^\+[1-9]\d{1,14}$/

export function csvTemplate(keys: string[]) {
  const columns = ["phone_number", ...keys]
  const sample = ["+14155551234", ...keys.map(() => "")]
  return `${columns.join(",")}\n${sample.join(",")}\n`
}

function parseCsvCell(cell: string) {
  return cell.trim().replace(/^"|"$/g, "")
}

function parseCsvLine(line: string) {
  return line.split(",").map(parseCsvCell)
}

function parseCsvText(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine)
}

function buildRecipientVariables(
  columns: string[],
  row: string[],
  phoneNumberIndex: number
) {
  const variables: Record<string, string> = {}

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
    const key = columns[columnIndex]
    if (!key || columnIndex === phoneNumberIndex) {
      continue
    }

    const value = (row[columnIndex] ?? "").trim()
    if (value) {
      variables[key] = value
    }
  }

  return variables
}

export function parseRecipientsCsv(
  text: string,
  keys: string[],
  t: TFunction
): {
  columns: string[]
  recipients: ParsedCsvRecipient[]
} {
  const rows = parseCsvText(text)
  const columns = rows[0]
  const dataRows = rows.slice(1)

  if (!columns || dataRows.length === 0) {
    throw new Error(
      t("components.batch_calls.recipients_csv.errors.missing_rows")
    )
  }

  const phoneNumberIndex = columns.findIndex(
    (column) => column.toLowerCase() === "phone_number"
  )

  if (phoneNumberIndex === -1) {
    throw new Error(
      t(
        "components.batch_calls.recipients_csv.errors.missing_phone_number_column"
      )
    )
  }

  const allowed = new Set(keys)
  for (const column of columns) {
    if (!column || column.toLowerCase() === "phone_number") {
      continue
    }
    if (!allowed.has(column)) {
      throw new Error(
        t("components.batch_calls.recipients_csv.errors.unknown_column", {
          column,
        })
      )
    }
  }

  const recipients: ParsedCsvRecipient[] = []

  for (let index = 0; index < dataRows.length; index++) {
    const row = dataRows[index]
    const toNumber = (row[phoneNumberIndex] ?? "").trim()

    if (!E164_REGEX.test(toNumber)) {
      throw new Error(
        t("components.batch_calls.recipients_csv.errors.invalid_phone_number", {
          row: index + 2,
        })
      )
    }

    const variables = buildRecipientVariables(columns, row, phoneNumberIndex)
    const recipient: ParsedCsvRecipient = { toNumber }

    if (Object.keys(variables).length > 0) {
      recipient.variables = variables
    }

    recipients.push(recipient)
  }

  return { columns, recipients }
}

export function downloadCsvTemplate(keys: string[]) {
  const blob = new Blob([csvTemplate(keys)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = "batch-call-recipients-template.csv"
  anchor.click()

  URL.revokeObjectURL(url)
}
