import type { SVGProps } from "react"

export function WaferIcon({ ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="7 8 17 17" {...props}>
      <path
        d="M7 16.5C7 21.1868 10.8212 25 15.5182 25H24V8H15.5182C10.8212 8 7 11.8131 7 16.5ZM9.49216 16.5C9.49216 13.0923 12.227 10.3191 15.589 10.3191C18.951 10.3191 21.6859 13.0923 21.6859 16.5C21.6859 19.9077 18.951 22.6809 15.589 22.6809C12.227 22.6809 9.49216 19.9077 9.49216 16.5Z"
        fill="currentColor"
      />
    </svg>
  )
}
