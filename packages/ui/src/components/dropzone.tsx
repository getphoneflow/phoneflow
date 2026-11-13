import { cn } from "cn"
import { useState } from "react"

type DropzoneProps = {
  accept?: string
  disabled?: boolean
  value?: File | null
  onValueChange?: (file: File | null) => void
  className?: string
  placeholder?: string
}

function Dropzone({
  accept,
  disabled,
  value,
  onValueChange,
  className,
  placeholder = "Click or drop a file",
}: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const selectFile = (file: File | undefined) => {
    if (file) {
      onValueChange?.(file)
    }
  }

  return (
    <label
      data-slot="dropzone"
      className={cn(
        "flex h-60 w-full min-w-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-input bg-background p-4 text-center text-sm text-muted-foreground hover:bg-muted/40",
        isDragActive && "border-ring bg-muted/50",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragActive(true)
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragActive(false)
        selectFile(event.dataTransfer.files[0])
      }}
    >
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          selectFile(event.target.files?.[0])
          event.target.value = ""
        }}
      />
      {value ? (
        <span
          className="inline-block max-w-full truncate text-foreground"
          title={value.name}
        >
          {value.name}
        </span>
      ) : (
        placeholder
      )}
    </label>
  )
}

export { Dropzone }
