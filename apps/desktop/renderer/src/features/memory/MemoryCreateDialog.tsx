import React from "react";

import { Button, Select, Text, Textarea } from "../../components/primitives";
import { Dialog } from "../../components/primitives/Dialog";
import { useMemoryStore } from "../../stores/memoryStore";

type MemoryType = "preference" | "fact" | "note";
type MemoryScope = "global" | "project" | "document";

/**
 * MemoryCreateDialog provides a modal interface for creating new memories.
 *
 * The dialog allows users to:
 * - Select memory type (preference/fact/note)
 * - Input memory content
 * - Scope is automatically set based on the active scope in MemoryPanel
 */
export function MemoryCreateDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: MemoryScope;
  scopeLabel: string;
}): JSX.Element {
  const create = useMemoryStore((s) => s.create);

  const [type, setType] = React.useState<MemoryType>("preference");
  const [content, setContent] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (props.open) {
      setType("preference");
      setContent("");
      setIsSubmitting(false);
    }
  }, [props.open]);

  const handleSubmit = async (): Promise<void> => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const res = await create({
      type,
      scope: props.scope,
      content: content.trim(),
    });

    if (res.ok) {
      props.onOpenChange(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="添加新记忆"
      description={`这条记忆将保存在「${props.scopeLabel}」层级`}
      footer={
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="md"
            onClick={() => props.onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => void handleSubmit()}
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        {/* Type selector */}
        <div className="flex flex-col gap-2">
          <Text size="small" color="muted">
            记忆类型
          </Text>
          <Select
            data-testid="memory-create-type"
            value={type}
            onValueChange={(value) => setType(value as MemoryType)}
            options={[
              { value: "preference", label: "偏好 — 写作风格、语言习惯" },
              { value: "fact", label: "事实 — 角色设定、世界观" },
              { value: "note", label: "笔记 — 临时提醒、待办事项" },
            ]}
            className="w-full"
          />
        </div>

        {/* Content input */}
        <div className="flex flex-col gap-2">
          <Text size="small" color="muted">
            记忆内容
          </Text>
          <Textarea
            data-testid="memory-create-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              type === "preference"
                ? "例如：我喜欢简洁有力的文风，避免过多形容词堆砌"
                : type === "fact"
                  ? "例如：主角陈默是一名 35 岁的刑警，性格沉稳但有心理创伤"
                  : "例如：记得在第七章增加一个误导性嫌疑人"
            }
            className="min-h-[120px]"
          />
        </div>

        {/* Scope info */}
        <div className="flex items-center gap-2 p-2 rounded bg-[var(--color-bg-subtle)]">
          <Text size="tiny" color="muted">
            💡 记忆层级由当前选中的 Tab 决定。切换 Tab
            后添加的记忆会保存到对应层级。
          </Text>
        </div>
      </div>
    </Dialog>
  );
}
