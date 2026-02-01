import React from "react";

import { Button, Card, Checkbox, Input, Select, Text, Textarea } from "../../components/primitives";
import { useProjectStore } from "../../stores/projectStore";
import { useMemoryStore } from "../../stores/memoryStore";

type MemoryType = "preference" | "fact" | "note";
type MemoryScope = "global" | "project";

/**
 * MemoryPanel is the minimal UI surface for memory CRUD/settings/preview.
 */
export function MemoryPanel(): JSX.Element {
  const projectId = useProjectStore((s) => s.current?.projectId ?? null);

  const bootstrapStatus = useMemoryStore((s) => s.bootstrapStatus);
  const items = useMemoryStore((s) => s.items);
  const settings = useMemoryStore((s) => s.settings);
  const preview = useMemoryStore((s) => s.preview);
  const lastError = useMemoryStore((s) => s.lastError);

  const bootstrapForProject = useMemoryStore((s) => s.bootstrapForProject);
  const create = useMemoryStore((s) => s.create);
  const remove = useMemoryStore((s) => s.remove);
  const updateSettings = useMemoryStore((s) => s.updateSettings);
  const previewInjection = useMemoryStore((s) => s.previewInjection);
  const clearPreview = useMemoryStore((s) => s.clearPreview);
  const clearError = useMemoryStore((s) => s.clearError);

  const [createType, setCreateType] = React.useState<MemoryType>("preference");
  const [createScope, setCreateScope] = React.useState<MemoryScope>("global");
  const [createContent, setCreateContent] = React.useState("");
  const [queryText, setQueryText] = React.useState("");

  React.useEffect(() => {
    void bootstrapForProject(projectId);
  }, [bootstrapForProject, projectId]);

  React.useEffect(() => {
    if (projectId === null && createScope === "project") {
      setCreateScope("global");
    }
  }, [createScope, projectId]);

  const disabledProjectScope = projectId === null;

  return (
    <section
      data-testid="memory-panel"
      className="flex flex-col gap-3 p-3 min-h-0"
    >
      <header className="flex items-center gap-2">
        <Text size="small" color="muted">Memory</Text>
        <Text size="tiny" color="muted" className="ml-auto">
          {bootstrapStatus}
        </Text>
      </header>

      {lastError ? (
        <Card noPadding className="p-2.5">
          <div className="flex gap-2 items-center">
            <Text data-testid="memory-error-code" size="code" color="muted">
              {lastError.code}
            </Text>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
          <Text size="small" color="muted" className="mt-1.5 block">
            {lastError.message}
          </Text>
        </Card>
      ) : null}

      <Card noPadding className="p-2.5 flex flex-col gap-2">
        <Text size="small" color="muted">Settings</Text>

        <Checkbox
          data-testid="memory-settings-injection"
          checked={settings?.injectionEnabled ?? true}
          onCheckedChange={(checked) =>
            void updateSettings({
              patch: { injectionEnabled: checked === true },
            })
          }
          disabled={!settings}
          label="Injection enabled"
        />

        <Checkbox
          data-testid="memory-settings-learning"
          checked={settings?.preferenceLearningEnabled ?? true}
          onCheckedChange={(checked) =>
            void updateSettings({
              patch: { preferenceLearningEnabled: checked === true },
            })
          }
          disabled={!settings}
          label="Preference learning enabled"
        />

        <Checkbox
          data-testid="memory-settings-privacy"
          checked={settings?.privacyModeEnabled ?? false}
          onCheckedChange={(checked) =>
            void updateSettings({
              patch: { privacyModeEnabled: checked === true },
            })
          }
          disabled={!settings}
          label="Privacy mode"
        />

        <div className="flex gap-2 items-center">
          <Text size="small" color="muted">Threshold</Text>
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
            className="ml-auto w-20 h-7"
          />
        </div>
      </Card>

      <Card noPadding className="p-2.5 flex flex-col gap-2">
        <Text size="small" color="muted">Create</Text>

        <div className="flex gap-2">
          <Select
            data-testid="memory-create-type"
            value={createType}
            onValueChange={(value) => setCreateType(value as MemoryType)}
            options={[
              { value: "preference", label: "preference" },
              { value: "fact", label: "fact" },
              { value: "note", label: "note" },
            ]}
            className="flex-1"
          />

          <Select
            data-testid="memory-create-scope"
            value={createScope}
            onValueChange={(value) => setCreateScope(value as MemoryScope)}
            options={[
              { value: "global", label: "global" },
              { value: "project", label: "project", disabled: disabledProjectScope },
            ]}
            className="flex-1"
          />
        </div>

        <Textarea
          data-testid="memory-create-content"
          value={createContent}
          onChange={(e) => setCreateContent(e.target.value)}
          placeholder="Write a preference / fact / note..."
          fullWidth
          className="min-h-[54px]"
        />

        <Button
          data-testid="memory-create-submit"
          variant="ghost"
          size="md"
          onClick={() =>
            void (async () => {
              const res = await create({
                type: createType,
                scope: createScope,
                content: createContent,
              });
              if (res.ok) {
                setCreateContent("");
              }
            })()
          }
        >
          Add
        </Button>
      </Card>

      <Card noPadding className="p-2.5 min-h-[120px] flex-1 overflow-auto flex flex-col gap-2">
        <Text size="small" color="muted">Items ({items.length})</Text>

        {items.length === 0 ? (
          <Text size="small" color="muted">No memories yet.</Text>
        ) : null}

        {items.map((item) => (
          <Card
            key={item.memoryId}
            data-testid={`memory-item-${item.memoryId}`}
            noPadding
            className="p-2 flex gap-2 items-start"
          >
            <div className="flex-1 min-w-0">
              <div className="flex gap-1.5">
                <Text size="code" color="muted">{item.type}</Text>
                <Text size="code" color="muted">{item.scope}</Text>
                <Text size="code" color="muted">{item.origin}</Text>
              </div>
              <Text size="small" className="mt-1.5 block whitespace-pre-wrap break-words">
                {item.content}
              </Text>
            </div>
            <Button
              data-testid={`memory-delete-${item.memoryId}`}
              variant="ghost"
              size="sm"
              onClick={() => void remove({ memoryId: item.memoryId })}
            >
              Delete
            </Button>
          </Card>
        ))}
      </Card>

      <Card noPadding className="p-2.5 flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <Text size="small" color="muted">Injection preview</Text>
          <Button
            data-testid="memory-preview-run"
            variant="ghost"
            size="sm"
            onClick={() => void previewInjection({ queryText })}
            className="ml-auto"
          >
            Preview
          </Button>
          <Button
            data-testid="memory-preview-clear"
            variant="ghost"
            size="sm"
            onClick={clearPreview}
          >
            Clear
          </Button>
        </div>

        <Input
          data-testid="memory-preview-query"
          type="text"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="queryText (optional)"
          fullWidth
        />

        {preview ? (
          <Card
            data-testid="memory-preview-result"
            noPadding
            className="p-2"
          >
            <Text size="small" color="muted">
              mode: <Text size="code" color="muted">{preview.mode}</Text>
            </Text>
            <Text size="small" color="muted" className="mt-1.5 block">
              items: <Text size="code" color="muted">{preview.items.length}</Text>
            </Text>
          </Card>
        ) : null}
      </Card>
    </section>
  );
}
