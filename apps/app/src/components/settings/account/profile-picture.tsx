import { useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { UploadIcon, XIcon } from "lucide-react"

import type { UploadUserImageResponse } from "@workspace/shared/api/user/types"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { updateUser } from "@/lib/auth/client"
import { env } from "@/lib/env"

type ProfilePictureProps = {
  name: string
  image: string | null | undefined
}

export function ProfilePicture({ name, image }: ProfilePictureProps) {
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${env.API_URL}/api/user/image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || "Failed to upload image")
      }

      const { url } = body as UploadUserImageResponse
      const result = await updateUser({ image: url })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success("Profile picture updated")
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const clearMutation = useMutation({
    mutationFn: async () => {
      const result = await updateUser({ image: null })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success("Profile picture removed")
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const isPending = uploadMutation.isPending || clearMutation.isPending

  return (
    <div>
      <div className="group relative size-16">
        <label
          className={cn(
            "relative block size-full cursor-pointer overflow-hidden rounded-full",
            isPending && "pointer-events-none opacity-50"
          )}
        >
          <Avatar className="size-full">
            <AvatarImage src={image ?? undefined} alt={name} />
            <AvatarFallback>{name?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>

          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/50 text-white",
              isPending ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            {isPending ? (
              <Spinner className="size-5" />
            ) : (
              <UploadIcon className="size-5" />
            )}
          </span>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isPending}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (file) {
                uploadMutation.mutate(file)
              }
            }}
          />
        </label>

        {image && !isPending && (
          <Button
            variant="secondary"
            size="icon-xs"
            className="absolute -top-1 -right-1 rounded-full opacity-0 group-hover:opacity-100"
            aria-label="Remove profile picture"
            onClick={() => clearMutation.mutate()}
          >
            <XIcon />
          </Button>
        )}
      </div>
    </div>
  )
}
