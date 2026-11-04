import type { FlowEndNode } from "@workspace/shared/api/agent-config/types"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "../base"

type EndNodePanelProps = {
  node: FlowEndNode
}

export function EndNodePanel({ node }: EndNodePanelProps) {
  const { t } = useTranslation()
  const readOnly = useAgentStore((state) => state.readOnly)
  const setNode = useAgentStore((state) => state.setNode)

  return (
    <FlowSidePanelBase title={t("components.flow.sidepanel.nodes.end.title")}>
      <FieldGroup>
        <Field>
          <FieldLabel>
            {t("components.flow.sidepanel.nodes.end.name.label")}
          </FieldLabel>
          <Input
            value={node.data.name}
            readOnly={readOnly}
            onChange={(event) =>
              setNode({
                ...node,
                data: { ...node.data, name: event.target.value },
              })
            }
          />
        </Field>
      </FieldGroup>
    </FlowSidePanelBase>
  )
}
