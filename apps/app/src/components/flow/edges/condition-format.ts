import type {
  ExpressionOperator,
  FlowEdgeCondition,
} from "@workspace/shared/api/agent-config/types"
import type { TFunction } from "@/lib/i18n"

export const operatorLabelKeys: Record<ExpressionOperator, string> = {
  greater_than: "components.flow.edges.condition_format.operators.greater_than",
  greater_or_equal:
    "components.flow.edges.condition_format.operators.greater_or_equal",
  less_than: "components.flow.edges.condition_format.operators.less_than",
  less_or_equal:
    "components.flow.edges.condition_format.operators.less_or_equal",
  equals: "components.flow.edges.condition_format.operators.equals",
  not_equals: "components.flow.edges.condition_format.operators.not_equals",
  contains: "components.flow.edges.condition_format.operators.contains",
  not_contains: "components.flow.edges.condition_format.operators.not_contains",
  exists: "components.flow.edges.condition_format.operators.exists",
  not_exists: "components.flow.edges.condition_format.operators.not_exists",
}

const valuelessOperators = new Set<ExpressionOperator>(["exists", "not_exists"])

export function operatorNeedsValue(operator: ExpressionOperator) {
  return !valuelessOperators.has(operator)
}

export function formatConditionLabel(
  condition: FlowEdgeCondition,
  t: TFunction
): string {
  switch (condition.type) {
    case "prompt":
      return condition.prompt
    case "expression": {
      const joiner =
        condition.match === "all"
          ? t("components.flow.edges.condition_format.match.all")
          : t("components.flow.edges.condition_format.match.any")
      return condition.conditions
        .map((entry) =>
          operatorNeedsValue(entry.operator)
            ? `${entry.variable} ${t(operatorLabelKeys[entry.operator])} ${entry.value ?? ""}`
            : `${entry.variable} ${t(operatorLabelKeys[entry.operator])}`
        )
        .join(joiner)
    }
    case "always":
      return t("components.flow.edges.condition_format.always")
  }
}
