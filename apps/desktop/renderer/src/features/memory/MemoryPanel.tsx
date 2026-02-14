import React from "react";

import type {
  IpcError,
  IpcResponseData,
} from "@shared/types/ipc-generated";
import { Button, Card, Text } from "../../components/primitives";
import { invoke } from "../../lib/ipcClient";
import { useProjectStore } from "../../stores/projectStore";

type PanelScope = "global" | "project";
type SemanticRule = IpcResponseData<"memory:semantic:list">["items"][number];
type SemanticCategory = SemanticRule["category"];
type MemorySettings = IpcResponseData<"memory:settings:get">;

type CategoryGroup = {
  category: SemanticCategory;
  label: string;
};

const CATEGORY_GROUPS: CategoryGroup[] = [
  { category: "style", label: "写作风格" },
  { category: "structure", label: "叙事结构" },
  { category: "character", label: "角色偏好" },
  { category: "pacing", label: "节奏偏好" },
  { category: "vocabulary", label: "词汇偏好" },
];

function formatUpdatedAt(ts: number | null): string {
  if (!ts || !Number.isFinite(ts)) {
    return "--";
  }
  return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}

/**
 * MemoryPanel implements MS-3 semantic-rule interaction surface.
 *
 * Why: panel-level behaviors (confirm/edit/delete/manual-add/pause) must be
 * directly user-controllable and decoupled from legacy entry CRUD workflows.
 */
export function MemoryPanel(): JSX.Element {
  const projectId = useProjectStore(
    (state) => state.current?.projectId ?? null,
  );

  const [status, setStatus] = React.useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [error, setError] = React.useState<IpcError | null>(null);
  const [rules, setRules] = React.useState<SemanticRule[]>([]);
  const [conflictCount, setConflictCount] = React.useState(0);
  const [settings, setSettings] = React.useState<MemorySettings | null>(null);
  const [activeScope, setActiveScope] = React.useState<PanelScope>("project");

  const [composerOpen, setComposerOpen] = React.useState(false);
  const [draftRule, setDraftRule] = React.useState("");
  const [draftCategory, setDraftCategory] =
    React.useState<SemanticCategory>("style");

  const [editingRuleId, setEditingRuleId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState("");

  const [distilling, setDistilling] = React.useState(false);

  const loadPanelData = React.useCallback(async () => {
    if (!projectId) {
      setRules([]);
      setConflictCount(0);
      setSettings(null);
      setStatus("ready");
      setError(null);
      setActiveScope("global");
      return;
    }

    setStatus("loading");
    setError(null);

    const [listRes, settingsRes] = await Promise.all([
      invoke("memory:semantic:list", { projectId }),
      invoke("memory:settings:get", {}),
    ]);

    if (!listRes.ok) {
      setStatus("error");
      setError(listRes.error);
      return;
    }

    if (!settingsRes.ok) {
      setStatus("error");
      setError(settingsRes.error);
      return;
    }

    setRules(listRes.data.items);
    setConflictCount(listRes.data.conflictQueue.length);
    setSettings(settingsRes.data);
    setStatus("ready");
  }, [projectId]);

  React.useEffect(() => {
    void loadPanelData();
  }, [loadPanelData]);

  React.useEffect(() => {
    if (projectId && activeScope === "global") {
      return;
    }
    if (!projectId && activeScope !== "global") {
      setActiveScope("global");
      return;
    }
    if (projectId && activeScope !== "project") {
      setActiveScope("project");
    }
  }, [activeScope, projectId]);

  const filteredRules = React.useMemo(
    () => rules.filter((rule) => rule.scope === activeScope),
    [activeScope, rules],
  );

  const groupedRules = React.useMemo(() => {
    return CATEGORY_GROUPS.map((group) => ({
      ...group,
      items: filteredRules.filter((rule) => rule.category === group.category),
    })).filter((group) => group.items.length > 0);
  }, [filteredRules]);

  const interactionCount = React.useMemo(() => {
    const ids = new Set<string>();
    for (const rule of rules) {
      for (const id of rule.supportingEpisodes) {
        ids.add(id);
      }
      for (const id of rule.contradictingEpisodes) {
        ids.add(id);
      }
    }
    return ids.size;
  }, [rules]);

  const latestUpdateAt = React.useMemo(() => {
    if (rules.length === 0) {
      return null;
    }
    return Math.max(...rules.map((rule) => rule.updatedAt));
  }, [rules]);

  async function handleConfirmRule(ruleId: string): Promise<void> {
    if (!projectId) {
      return;
    }

    const res = await invoke("memory:semantic:update", {
      projectId,
      ruleId,
      patch: {
        userConfirmed: true,
      },
    });

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? res.data.item : rule)),
    );
  }

  function startEdit(rule: SemanticRule): void {
    setEditingRuleId(rule.id);
    setEditingText(rule.rule);
  }

  async function handleSaveEdit(ruleId: string): Promise<void> {
    if (!projectId) {
      return;
    }

    const normalized = editingText.trim();
    if (normalized.length === 0) {
      setError({ code: "INVALID_ARGUMENT", message: "规则文本不能为空" });
      return;
    }

    const res = await invoke("memory:semantic:update", {
      projectId,
      ruleId,
      patch: {
        rule: normalized,
        userModified: true,
      },
    });

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? res.data.item : rule)),
    );
    setEditingRuleId(null);
    setEditingText("");
  }

  async function handleDeleteRule(ruleId: string): Promise<void> {
    if (!projectId) {
      return;
    }

    const confirmed = window.confirm("确认删除这条偏好规则吗？");
    if (!confirmed) {
      return;
    }

    const res = await invoke("memory:semantic:delete", { projectId, ruleId });
    if (!res.ok) {
      setError(res.error);
      return;
    }

    setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  }

  async function handleCreateRule(): Promise<void> {
    if (!projectId) {
      return;
    }

    const normalized = draftRule.trim();
    if (normalized.length === 0) {
      setError({ code: "INVALID_ARGUMENT", message: "规则文本不能为空" });
      return;
    }

    const res = await invoke("memory:semantic:add", {
      projectId,
      rule: normalized,
      category: draftCategory,
      confidence: 1,
      scope: activeScope,
      userConfirmed: true,
      userModified: false,
    });

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setRules((prev) => [res.data.item, ...prev]);
    setComposerOpen(false);
    setDraftRule("");
    setDraftCategory("style");
  }

  async function handleDistill(): Promise<void> {
    if (!projectId) {
      return;
    }

    setDistilling(true);
    const res = await invoke("memory:semantic:distill", {
      projectId,
      trigger: "manual",
    });
    setDistilling(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    await loadPanelData();
  }

  async function handleLearningToggle(): Promise<void> {
    if (!settings) {
      return;
    }

    const res = await invoke("memory:settings:update", {
      patch: {
        preferenceLearningEnabled: !settings.preferenceLearningEnabled,
      },
    });

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setSettings(res.data);
  }

  return (
    <section
      data-testid="memory-panel"
      className="h-full min-h-0 flex flex-col gap-3 p-3 bg-[var(--color-bg-surface)]"
    >
      <header className="shrink-0 flex items-center gap-2">
        <Text size="small" color="muted">
          Memory
        </Text>
        <Text size="tiny" color="muted" className="ml-auto">
          {status}
        </Text>
      </header>

      <div className="shrink-0 flex gap-1">
        <button
          type="button"
          data-testid="memory-scope-global"
          className={`text-xs px-2 py-1 rounded-[var(--radius-sm)] border ${
            activeScope === "global"
              ? "border-[var(--color-border-focus)] bg-[var(--color-bg-raised)]"
              : "border-[var(--color-border-default)]"
          }`}
          onClick={() => setActiveScope("global")}
        >
          全局
        </button>
        <button
          type="button"
          data-testid="memory-scope-project"
          disabled={!projectId}
          className={`text-xs px-2 py-1 rounded-[var(--radius-sm)] border ${
            activeScope === "project"
              ? "border-[var(--color-border-focus)] bg-[var(--color-bg-raised)]"
              : "border-[var(--color-border-default)]"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={() => setActiveScope("project")}
        >
          本项目
        </button>
      </div>

      {!settings?.preferenceLearningEnabled ? (
        <Card
          noPadding
          data-testid="memory-learning-paused"
          className="shrink-0 px-2.5 py-2 border-[var(--color-warning)] text-[var(--color-warning)]"
        >
          <Text size="small" className="text-[var(--color-warning)]">
            学习已暂停：新情景仍记录，但不会触发蒸馏更新
          </Text>
        </Card>
      ) : null}

      {conflictCount > 0 ? (
        <Card
          noPadding
          data-testid="memory-conflict-notice"
          className="shrink-0 px-2.5 py-2 border-[var(--color-warning)] text-[var(--color-warning)]"
        >
          <Text size="small" className="text-[var(--color-warning)]">
            检测到 {conflictCount} 条偏好冲突，请优先处理。
          </Text>
        </Card>
      ) : null}

      {error ? (
        <Card noPadding className="shrink-0 p-2.5">
          <div className="flex items-center gap-2">
            <Text data-testid="memory-error-code" size="code" color="muted">
              {error.code}
            </Text>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
          <Text size="small" color="muted" className="mt-1.5 block">
            {error.message}
          </Text>
        </Card>
      ) : null}

      <Card
        noPadding
        className="flex-1 min-h-0 overflow-auto p-2.5 bg-[var(--color-bg-surface)]"
      >
        {status === "loading" ? (
          <div className="h-full flex items-center justify-center">
            <Text size="small" color="muted">
              加载中...
            </Text>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--color-bg-raised)] flex items-center justify-center text-[var(--color-fg-muted)]">
              ✦
            </div>
            <Text size="small" color="muted">
              AI 正在学习你的写作偏好，使用越多越精准
            </Text>
            <Button size="sm" onClick={() => setComposerOpen(true)}>
              手动添加规则
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groupedRules.map((group) => (
              <div key={group.category} className="flex flex-col gap-2">
                <Text size="small" color="muted">
                  {group.label}
                </Text>
                {group.items.map((rule) => {
                  const isEditing = editingRuleId === rule.id;
                  return (
                    <Card
                      key={rule.id}
                      data-testid={`memory-rule-${rule.id}`}
                      noPadding
                      className="p-2.5 bg-[var(--color-bg-raised)] rounded-[var(--radius-sm)]"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <label
                                className="text-xs text-[var(--color-fg-muted)]"
                                htmlFor={`memory-edit-${rule.id}`}
                              >
                                规则文本
                              </label>
                              <textarea
                                id={`memory-edit-${rule.id}`}
                                aria-label="规则文本"
                                value={editingText}
                                onChange={(event) =>
                                  setEditingText(event.target.value)
                                }
                                className="min-h-[70px] rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 py-1.5 text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => void handleSaveEdit(rule.id)}
                                >
                                  保存修改
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingRuleId(null);
                                    setEditingText("");
                                  }}
                                >
                                  取消
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Text
                                size="small"
                                className="whitespace-pre-wrap break-words"
                              >
                                {rule.rule}
                              </Text>
                              <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
                                <span>
                                  置信度 {Math.round(rule.confidence * 100)}%
                                </span>
                                {rule.userConfirmed ? (
                                  <span>已确认</span>
                                ) : null}
                                {rule.userModified ? <span>已修改</span> : null}
                              </div>
                            </>
                          )}
                        </div>

                        {!isEditing ? (
                          <div className="shrink-0 flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={rule.userConfirmed}
                              onClick={() => void handleConfirmRule(rule.id)}
                            >
                              确认
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(rule)}
                            >
                              修改
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => void handleDeleteRule(rule.id)}
                            >
                              删除
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        noPadding
        className="shrink-0 p-2.5 bg-[var(--color-bg-raised)] rounded-[var(--radius-sm)]"
      >
        <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)]">
          <span>交互记录数 {interactionCount}</span>
          <span>最近更新 {formatUpdatedAt(latestUpdateAt)}</span>
        </div>
      </Card>

      <div className="shrink-0 flex items-center gap-2">
        <Button size="sm" onClick={() => setComposerOpen(true)}>
          手动添加规则
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={distilling}
          onClick={() => void handleDistill()}
        >
          更新偏好
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void handleLearningToggle()}
        >
          {settings?.preferenceLearningEnabled === false
            ? "恢复学习"
            : "暂停学习"}
        </Button>
      </div>

      {composerOpen ? (
        <Card
          noPadding
          className="shrink-0 p-2.5 bg-[var(--color-bg-raised)] rounded-[var(--radius-sm)]"
        >
          <div className="flex flex-col gap-2">
            <label
              className="text-xs text-[var(--color-fg-muted)]"
              htmlFor="memory-rule-create-input"
            >
              新增规则
            </label>
            <textarea
              id="memory-rule-create-input"
              aria-label="新增规则"
              value={draftRule}
              onChange={(event) => setDraftRule(event.target.value)}
              className="min-h-[72px] rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 py-1.5 text-sm"
            />
            <label
              className="text-xs text-[var(--color-fg-muted)]"
              htmlFor="memory-rule-category"
            >
              分类
            </label>
            <select
              id="memory-rule-category"
              value={draftCategory}
              onChange={(event) =>
                setDraftCategory(event.target.value as SemanticCategory)
              }
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm"
            >
              {CATEGORY_GROUPS.map((group) => (
                <option key={group.category} value={group.category}>
                  {group.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => void handleCreateRule()}>
                保存规则
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setComposerOpen(false);
                  setDraftRule("");
                }}
              >
                取消
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
