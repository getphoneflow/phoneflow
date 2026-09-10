import type { SVGProps } from "react"

export function ElevenLabsIcon({ ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="currentColor"
      fillRule="evenodd"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M5 0h5v24H5V0zM14 0h5v24h-5V0z"></path>
    </svg>
  )
}
