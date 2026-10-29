import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { VariableTextField } from "@/components/flow/variables/variable-text-field"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "./base"

export function GlobalPromptPanel() {
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  return (
    <FlowSidePanelBase title="Global prompt">
      <FieldGroup>
        <Field>
          <FieldLabel>Global prompt</FieldLabel>
          <VariableTextField
            multiline
            rows={12}
            value={config.globalPrompt}
            readOnly={readOnly}
            onChange={(globalPrompt) => setConfig({ ...config, globalPrompt })}
            placeholder="You are a helpful assistant"
          />
        </Field>
      </FieldGroup>
    </FlowSidePanelBase>
  )
}
