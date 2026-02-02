import { Button, Checkbox, Input, Text } from "../../components/primitives";
import { Dialog } from "../../components/primitives/Dialog";
import { useMemoryStore } from "../../stores/memoryStore";

/**
 * MemorySettingsDialog provides a modal interface for memory system settings.
 *
 * Settings include:
 * - injectionEnabled: Whether AI uses memories during writing
 * - preferenceLearningEnabled: Whether AI learns from user feedback
 * - privacyModeEnabled: Reduces storage of identifiable content
 * - preferenceLearningThreshold: How many signals before learning triggers
 */
export function MemorySettingsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const settings = useMemoryStore((s) => s.settings);
  const updateSettings = useMemoryStore((s) => s.updateSettings);

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="记忆设置"
      description="控制 AI 如何使用和学习你的记忆"
      footer={
        <Button
          variant="primary"
          size="md"
          onClick={() => props.onOpenChange(false)}
        >
          完成
        </Button>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <Checkbox
          data-testid="memory-settings-injection"
          checked={settings?.injectionEnabled ?? true}
          onCheckedChange={(checked) =>
            void updateSettings({
              patch: { injectionEnabled: checked === true },
            })
          }
          disabled={!settings}
          label="启用记忆注入"
        />
        <Text size="tiny" color="muted" className="-mt-2 ml-6">
          AI 在写作时会参考你的记忆
        </Text>

        <Checkbox
          data-testid="memory-settings-learning"
          checked={settings?.preferenceLearningEnabled ?? true}
          onCheckedChange={(checked) =>
            void updateSettings({
              patch: { preferenceLearningEnabled: checked === true },
            })
          }
          disabled={!settings}
          label="启用偏好学习"
        />
        <Text size="tiny" color="muted" className="-mt-2 ml-6">
          AI 会从你的反馈中学习写作偏好
        </Text>

        <Checkbox
          data-testid="memory-settings-privacy"
          checked={settings?.privacyModeEnabled ?? false}
          onCheckedChange={(checked) =>
            void updateSettings({
              patch: { privacyModeEnabled: checked === true },
            })
          }
          disabled={!settings}
          label="隐私模式"
        />
        <Text size="tiny" color="muted" className="-mt-2 ml-6">
          减少存储可识别的内容片段
        </Text>

        <div className="flex items-center gap-3 mt-2">
          <Text size="small" color="muted">学习阈值</Text>
          <Input
            data-testid="memory-settings-threshold"
            type="number"
            min={1}
            max={100}
            value={settings?.preferenceLearningThreshold ?? 3}
            onChange={(e) =>
              void updateSettings({
                patch: { preferenceLearningThreshold: Number(e.target.value) },
              })
            }
            disabled={!settings}
            className="w-20 h-8"
          />
        </div>
        <Text size="tiny" color="muted" className="-mt-2">
          收到多少次相同信号后触发学习（默认 3）
        </Text>
      </div>
    </Dialog>
  );
}
