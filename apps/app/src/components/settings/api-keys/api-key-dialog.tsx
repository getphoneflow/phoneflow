import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { statement } from "@workspace/shared/auth/api-keys"
import { apiKeyExpirationSeconds } from "@workspace/shared/api/api-keys/schemas"
import type {
  ApiKeyResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
} from "@workspace/shared/api/api-keys/types"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { CopyButton } from "@/components/copy-button"
import { PermissionFields } from "@/components/settings/permission-fields"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

type ExpirationChoice = "keep" | "never" | "30" | "90" | "365"

const expirationSeconds = {
  "30": apiKeyExpirationSeconds[30],
  "90": apiKeyExpirationSeconds[90],
  "365": apiKeyExpirationSeconds[365],
} as const

type ApiKeyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey?: ApiKeyResponse
}

export function ApiKeyDialog({
  open,
  onOpenChange,
  apiKey,
}: ApiKeyDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [expiration, setExpiration] = useState<ExpirationChoice>(
    apiKey ? "keep" : "never"
  )
  const [permission, setPermission] = useState<Record<string, string[]>>({})
  const [secret, setSecret] = useState<string | null>(null)
  const [openKeyId, setOpenKeyId] = useState<string | null>(null)
  const nextOpenKeyId = open ? (apiKey?.id ?? "new") : null

  if (open && nextOpenKeyId !== openKeyId) {
    setOpenKeyId(nextOpenKeyId)
    setName(apiKey?.name ?? "")
    setNameError(null)
    setExpiration(apiKey ? "keep" : "never")
    setSecret(null)
    setPermission(
      Object.fromEntries(
        Object.entries(apiKey?.permissions ?? {}).filter(
          (entry): entry is [string, string[]] =>
            entry[0] in statement && Array.isArray(entry[1])
        )
      )
    )
  }

  if (!open && openKeyId !== null) {
    setOpenKeyId(null)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nextPermission = Object.fromEntries(
        Object.entries(permission).filter(([, actions]) => actions.length > 0)
      )
      const expiresIn =
        expiration === "keep" || expiration === "never"
          ? expiration === "never"
            ? null
            : undefined
          : expirationSeconds[expiration]

      if (apiKey) {
        const result = await api.patch<ApiKeyResponse, UpdateApiKeyRequest>(
          `/api-keys/${apiKey.id}`,
          {
            body: {
              name: name.trim(),
              permissions: nextPermission,
              ...(expiresIn !== undefined ? { expiresIn } : {}),
            },
          }
        )
        return result
      }

      return api.post<CreateApiKeyResponse, CreateApiKeyRequest>("/api-keys", {
        body: {
          name: name.trim(),
          permissions: nextPermission,
          ...(typeof expiresIn === "number" ? { expiresIn } : {}),
        },
      })
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
      if (!apiKey && "key" in result && typeof result.key === "string") {
        setSecret(result.key)
        toast.success(
          t("components.settings.api_keys.api_key_dialog.toasts.created", {
            name: name.trim(),
          })
        )
        return
      }
      toast.success(
        t("components.settings.api_keys.api_key_dialog.toasts.updated", {
          name: name.trim(),
        })
      )
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function toggle(resource: string, action: string, checked: boolean) {
    setPermission((current) => {
      const actions = new Set(current[resource] ?? [])
      if (checked) {
        actions.add(action)
      } else {
        actions.delete(action)
      }
      return { ...current, [resource]: [...actions] }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        saveMutation.reset()
      }}
    >
      <DialogContent>
        {secret ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("components.settings.api_keys.api_key_dialog.secret_title")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "components.settings.api_keys.api_key_dialog.secret_description"
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-2">
              <code className="block min-w-0 flex-1 break-all rounded-md border bg-muted p-3 font-mono text-sm">
                {secret}
              </code>
              <CopyButton value={secret} />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" />}>
                {t("components.settings.api_keys.api_key_dialog.done")}
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {apiKey
                  ? t("components.settings.api_keys.api_key_dialog.edit_title")
                  : t(
                      "components.settings.api_keys.api_key_dialog.create_title"
                    )}
              </DialogTitle>
              <DialogDescription>
                {apiKey
                  ? t(
                      "components.settings.api_keys.api_key_dialog.edit_description",
                      { name: apiKey.name ?? "" }
                    )
                  : t(
                      "components.settings.api_keys.api_key_dialog.create_description"
                    )}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (!name.trim()) {
                  setNameError(
                    "components.settings.api_keys.api_key_dialog.name.label"
                  )
                  return
                }
                setNameError(null)
                saveMutation.mutate()
              }}
            >
              <FieldGroup>
                <Field data-invalid={Boolean(nameError)}>
                  <FieldLabel htmlFor="api-key-name">
                    {t(
                      "components.settings.api_keys.api_key_dialog.name.label"
                    )}
                  </FieldLabel>
                  <Input
                    id="api-key-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t(
                      "components.settings.api_keys.api_key_dialog.name.placeholder"
                    )}
                    autoFocus={!apiKey}
                    disabled={saveMutation.isPending}
                    aria-invalid={Boolean(nameError)}
                  />
                  {nameError ? (
                    <FieldError>
                      {t("schemas.api_keys.name.required")}
                    </FieldError>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel>
                    {t(
                      "components.settings.api_keys.api_key_dialog.expiration.label"
                    )}
                  </FieldLabel>
                  <Select
                    value={expiration}
                    onValueChange={(value) =>
                      setExpiration(value as ExpirationChoice)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {expiration === "keep"
                          ? t(
                              "components.settings.api_keys.api_key_dialog.expiration.keep"
                            )
                          : expiration === "never"
                            ? t(
                                "components.settings.api_keys.api_key_dialog.expiration.never"
                              )
                            : t(
                                "components.settings.api_keys.api_key_dialog.expiration.days",
                                { count: Number(expiration) }
                              )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {apiKey ? (
                        <SelectItem value="keep">
                          {t(
                            "components.settings.api_keys.api_key_dialog.expiration.keep"
                          )}
                        </SelectItem>
                      ) : null}
                      <SelectItem value="never">
                        {t(
                          "components.settings.api_keys.api_key_dialog.expiration.never"
                        )}
                      </SelectItem>
                      {(["30", "90", "365"] as const).map((days) => (
                        <SelectItem key={days} value={days}>
                          {t(
                            "components.settings.api_keys.api_key_dialog.expiration.days",
                            { count: Number(days) }
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <PermissionFields
                  statements={statement}
                  idPrefix={apiKey?.id ?? "new-api-key"}
                  permission={permission}
                  disabled={saveMutation.isPending}
                  onToggle={toggle}
                />
              </FieldGroup>
              <DialogFooter className="mt-6">
                <DialogClose>
                  <Button variant="outline" disabled={saveMutation.isPending}>
                    {t("common.actions.cancel")}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Spinner className="mx-6" />
                  ) : apiKey ? (
                    t("common.actions.save")
                  ) : (
                    t(
                      "components.settings.api_keys.api_key_dialog.create_submit"
                    )
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
