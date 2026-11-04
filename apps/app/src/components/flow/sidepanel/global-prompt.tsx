import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { VariableTextField } from "@/components/flow/variables/variable-text-field"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "./base"

export function GlobalPromptPanel() {
  const { t } = useTranslation()
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  return (
    <FlowSidePanelBase
      title={t("components.flow.sidepanel.global_prompt.title")}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>
            {t("components.flow.sidepanel.global_prompt.prompt.label")}
          </FieldLabel>
          <VariableTextField
            multiline
            rows={12}
            value={config.globalPrompt}
            readOnly={readOnly}
            onChange={(globalPrompt) => setConfig({ ...config, globalPrompt })}
            placeholder={t(
              "components.flow.sidepanel.global_prompt.prompt.placeholder"
            )}
          />
        </Field>
      </FieldGroup>
    </FlowSidePanelBase>
  )
}
