import { Button } from "../../components/primitives/Button";
import { Card } from "../../components/primitives/Card";
import { Text } from "../../components/primitives/Text";

/**
 * Guidance component shown when no API Key is configured.
 *
 * Displays a message prompting the user to configure their AI service
 * and provides a button to navigate to the settings panel.
 */
export function AiNotConfiguredGuide(props: {
  onNavigateToSettings: () => void;
}): JSX.Element {
  return (
    <Card
      data-testid="ai-not-configured-guide"
      variant="raised"
      className="flex flex-col items-center gap-3 p-6 rounded-[var(--radius-lg)]"
    >
      <Text size="body" weight="bold">
        请先在设置中配置 AI 服务
      </Text>

      <Text size="small" color="muted" className="text-center">
        需要配置 API Key 才能使用 AI 功能。支持 OpenAI、Anthropic 及兼容代理。
      </Text>

      <Button
        variant="primary"
        size="sm"
        onClick={props.onNavigateToSettings}
      >
        前往设置
      </Button>
    </Card>
  );
}
