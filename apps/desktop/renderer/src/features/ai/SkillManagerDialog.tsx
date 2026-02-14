import { useEffect, useMemo, useState } from "react";

import type {
  IpcError,
  IpcResponseData,
} from "@shared/types/ipc-generated";
import { SystemDialog } from "../../components/features/AiDialogs/SystemDialog";
import { Dialog, Text } from "../../components/primitives";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { invoke } from "../../lib/ipcClient";

export type CustomSkillListItem =
  IpcResponseData<"skill:custom:list">["items"][number];

type SkillFormState = {
  name: string;
  description: string;
  promptTemplate: string;
  inputType: "selection" | "document";
  scope: "global" | "project";
  enabled: boolean;
  contextRulesText: string;
};

type CustomSkillContextRules = Record<string, string | number | boolean>;

const DEFAULT_FORM: SkillFormState = {
  name: "",
  description: "",
  promptTemplate: "",
  inputType: "selection",
  scope: "project",
  enabled: true,
  contextRulesText: "{}",
};

function buildSkillDraftFromDescription(
  description: string,
): Pick<
  SkillFormState,
  "name" | "description" | "promptTemplate" | "inputType" | "contextRulesText"
> {
  const normalized = description.trim();
  const shortName = normalized.slice(0, 16) || "AI 生成技能";

  return {
    name: shortName,
    description: normalized,
    promptTemplate: `请根据以下要求处理文本：${normalized}\n\n原文：{{input}}`,
    inputType: normalized.includes("续写") ? "document" : "selection",
    contextRulesText: JSON.stringify({ style_guide: true }, null, 2),
  };
}

function parseContextRulesText(
  text: string,
):
  | { ok: true; data: CustomSkillContextRules }
  | { ok: false; message: string } {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { ok: false, message: "contextRules 必须是 JSON 对象" };
    }
    return { ok: true, data: parsed as CustomSkillContextRules };
  } catch {
    return { ok: false, message: "contextRules 不是合法 JSON" };
  }
}

function readFieldName(error: IpcError): string | null {
  const details = error.details;
  if (!details || typeof details !== "object") {
    return null;
  }
  const fieldName = (details as { fieldName?: unknown }).fieldName;
  return typeof fieldName === "string" ? fieldName : null;
}

/**
 * SkillManagerDialog provides custom skill CRUD + AI-assisted drafting.
 *
 * Why: P2 requires a dedicated management surface for manual create/edit/delete,
 * AI-assisted draft generation, and inline validation feedback.
 */
export function SkillManagerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onSaved?: () => Promise<void> | void;
}): JSX.Element {
  const [items, setItems] = useState<CustomSkillListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<SkillFormState>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { confirm, dialogProps } = useConfirmDialog();

  const title = useMemo(
    () => (editingId ? "编辑自定义技能" : "创建自定义技能"),
    [editingId],
  );

  async function loadCustomSkills(): Promise<void> {
    setLoading(true);
    const listed = await invoke("skill:custom:list", {});
    if (!listed.ok) {
      setFormError(listed.error.message);
      setLoading(false);
      return;
    }
    setItems(listed.data.items);
    setLoading(false);
  }

  useEffect(() => {
    if (!props.open) {
      return;
    }
    const timer = setTimeout(() => {
      void loadCustomSkills();
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [props.open]);

  function resetForm(): void {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setFieldErrors({});
  }

  async function handleAiGenerate(): Promise<void> {
    const prompt = aiDescription.trim();
    if (prompt.length === 0) {
      setFormError("请先输入技能需求描述");
      return;
    }

    const generated = await invoke("ai:chat:send", {
      message: prompt,
      projectId: props.projectId ?? "skill-manager",
    });
    if (!generated.ok) {
      setFormError(generated.error.message);
      return;
    }

    const draft = buildSkillDraftFromDescription(generated.data.echoed);
    setForm((prev) => ({
      ...prev,
      ...draft,
    }));
    setFormError(null);
    setFieldErrors({});
  }

  async function handleDelete(item: CustomSkillListItem): Promise<void> {
    const confirmed = await confirm({
      title: `确定删除技能"${item.name}"？`,
      description: "此操作不可撤销",
      primaryLabel: "删除",
      secondaryLabel: "取消",
    });
    if (!confirmed) {
      return;
    }

    const deleted = await invoke("skill:custom:delete", { id: item.id });
    if (!deleted.ok) {
      setFormError(deleted.error.message);
      return;
    }

    await loadCustomSkills();
    await props.onSaved?.();

    if (editingId === item.id) {
      resetForm();
    }
  }

  function handleEdit(item: CustomSkillListItem): void {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      promptTemplate: item.promptTemplate,
      inputType: item.inputType,
      scope: item.scope,
      enabled: item.enabled,
      contextRulesText: JSON.stringify(item.contextRules, null, 2),
    });
    setFormError(null);
    setFieldErrors({});
  }

  async function handleSubmit(): Promise<void> {
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const parsedRules = parseContextRulesText(form.contextRulesText);
    if (!parsedRules.ok) {
      setFieldErrors({ contextRules: parsedRules.message });
      setSubmitting(false);
      return;
    }

    if (editingId) {
      const updated = await invoke("skill:custom:update", {
        id: editingId,
        name: form.name,
        description: form.description,
        promptTemplate: form.promptTemplate,
        inputType: form.inputType,
        contextRules: parsedRules.data,
        scope: form.scope,
        enabled: form.enabled,
      });
      if (!updated.ok) {
        const fieldName = readFieldName(updated.error);
        if (fieldName) {
          setFieldErrors({ [fieldName]: updated.error.message });
        } else {
          setFormError(updated.error.message);
        }
        setSubmitting(false);
        return;
      }
    } else {
      const created = await invoke("skill:custom:create", {
        name: form.name,
        description: form.description,
        promptTemplate: form.promptTemplate,
        inputType: form.inputType,
        contextRules: parsedRules.data,
        scope: form.scope,
        enabled: form.enabled,
      });
      if (!created.ok) {
        const fieldName = readFieldName(created.error);
        if (fieldName) {
          setFieldErrors({ [fieldName]: created.error.message });
        } else {
          setFormError(created.error.message);
        }
        setSubmitting(false);
        return;
      }
    }

    await loadCustomSkills();
    await props.onSaved?.();
    resetForm();
    setSubmitting(false);
  }

  return (
    <>
      <Dialog
        open={props.open}
        onOpenChange={(nextOpen) => {
          props.onOpenChange(nextOpen);
          if (!nextOpen) {
            resetForm();
          }
        }}
        title="技能管理"
        description="手动创建、AI 辅助创建、编辑和删除自定义技能。"
        footer={
          <>
            <button
              type="button"
              className="px-3 py-2 rounded border border-[var(--color-border-default)] text-[var(--color-fg-default)]"
              onClick={resetForm}
              data-testid="skill-manager-reset"
            >
              重置
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-[var(--color-accent-emphasis)] text-[var(--color-fg-on-emphasis)] disabled:opacity-50"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              data-testid="skill-manager-save"
            >
              {submitting ? "保存中..." : editingId ? "保存修改" : "创建技能"}
            </button>
          </>
        }
      >
        <div className="space-y-4" data-testid="skill-manager-dialog">
          <section className="space-y-2">
            <Text size="tiny" color="muted" className="uppercase tracking-wide">
              AI 辅助创建
            </Text>
            <textarea
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="例如：创建一个技能，把选中文本改写成鲁迅风格"
              className="w-full min-h-20 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-2 text-sm"
              data-testid="skill-manager-ai-description"
            />
            <button
              type="button"
              className="px-3 py-2 rounded border border-[var(--color-border-default)] text-[var(--color-fg-default)]"
              onClick={() => void handleAiGenerate()}
              data-testid="skill-manager-ai-generate"
            >
              AI 生成配置
            </button>
          </section>

          <section className="space-y-2">
            <Text size="tiny" color="muted" className="uppercase tracking-wide">
              {title}
            </Text>

            <label className="block text-xs text-[var(--color-fg-muted)]">
              名称
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-2 text-sm"
                data-testid="skill-form-name"
              />
              {fieldErrors.name && (
                <span className="mt-1 block text-xs text-[var(--color-error)]">
                  {fieldErrors.name}
                </span>
              )}
            </label>

            <label className="block text-xs text-[var(--color-fg-muted)]">
              描述
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-2 text-sm"
                data-testid="skill-form-description"
              />
              {fieldErrors.description && (
                <span className="mt-1 block text-xs text-[var(--color-error)]">
                  {fieldErrors.description}
                </span>
              )}
            </label>

            <label className="block text-xs text-[var(--color-fg-muted)]">
              Prompt 模板
              <textarea
                value={form.promptTemplate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    promptTemplate: e.target.value,
                  }))
                }
                placeholder="包含 {{input}} 占位符"
                className="mt-1 w-full min-h-20 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-2 text-sm"
                data-testid="skill-form-prompt-template"
              />
              {fieldErrors.promptTemplate && (
                <span
                  className="mt-1 block text-xs text-[var(--color-error)]"
                  data-testid="skill-form-error-promptTemplate"
                >
                  {fieldErrors.promptTemplate}
                </span>
              )}
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-[var(--color-fg-muted)]">
                输入类型
                <select
                  value={form.inputType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      inputType: e.target.value as "selection" | "document",
                    }))
                  }
                  className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-2 text-sm"
                  data-testid="skill-form-input-type"
                >
                  <option value="selection">选中文本</option>
                  <option value="document">文档上下文</option>
                </select>
              </label>

              <label className="block text-xs text-[var(--color-fg-muted)]">
                作用域
                <select
                  value={form.scope}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      scope: e.target.value as "global" | "project",
                    }))
                  }
                  className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-2 text-sm"
                  data-testid="skill-form-scope"
                >
                  <option value="project">项目级</option>
                  <option value="global">全局</option>
                </select>
              </label>
            </div>

            <label className="block text-xs text-[var(--color-fg-muted)]">
              contextRules (JSON)
              <textarea
                value={form.contextRulesText}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    contextRulesText: e.target.value,
                  }))
                }
                className="mt-1 w-full min-h-16 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-2 text-sm"
                data-testid="skill-form-context-rules"
              />
              {fieldErrors.contextRules && (
                <span className="mt-1 block text-xs text-[var(--color-error)]">
                  {fieldErrors.contextRules}
                </span>
              )}
            </label>

            <label className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                data-testid="skill-form-enabled"
              />
              启用技能
            </label>
          </section>

          {formError && (
            <div
              className="rounded border border-[var(--color-error)]/40 bg-[var(--color-error-subtle)] p-2 text-xs text-[var(--color-error)]"
              data-testid="skill-form-error"
            >
              {formError}
            </div>
          )}

          <section className="space-y-2">
            <Text size="tiny" color="muted" className="uppercase tracking-wide">
              自定义技能列表
            </Text>
            {loading ? (
              <Text size="small" color="muted">
                加载中...
              </Text>
            ) : items.length === 0 ? (
              <Text size="small" color="muted">
                暂无自定义技能
              </Text>
            ) : (
              <div className="space-y-2" data-testid="skill-manager-list">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded border border-[var(--color-border-default)] p-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Text size="small" weight="semibold">
                          {item.name}
                        </Text>
                        <Text size="tiny" color="muted">
                          {item.scope === "project" ? "项目级" : "全局"} ·{" "}
                          {item.inputType}
                        </Text>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="px-2 py-1 rounded border border-[var(--color-border-default)] text-xs"
                          onClick={() => handleEdit(item)}
                          data-testid={`skill-item-edit-${item.id}`}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 rounded border border-[var(--color-error)]/30 text-xs text-[var(--color-error)]"
                          onClick={() => void handleDelete(item)}
                          data-testid={`skill-item-delete-${item.id}`}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </Dialog>

      <SystemDialog {...dialogProps} />
    </>
  );
}
