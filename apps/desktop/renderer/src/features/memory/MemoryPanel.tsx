import React from "react";

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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 12,
        minHeight: 0,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          Memory
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--color-fg-muted)",
          }}
        >
          {bootstrapStatus}
        </div>
      </header>

      {lastError ? (
        <div
          style={{
            border: "1px solid var(--color-separator)",
            borderRadius: 8,
            padding: 10,
            background: "var(--color-bg-base)",
            color: "var(--color-fg-muted)",
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              data-testid="memory-error-code"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
            >
              {lastError.code}
            </div>
            <button
              type="button"
              onClick={clearError}
              style={{
                marginLeft: "auto",
                border: "1px solid var(--color-separator)",
                background: "transparent",
                color: "var(--color-fg-muted)",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
          <div style={{ marginTop: 6 }}>{lastError.message}</div>
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid var(--color-separator)",
          borderRadius: 8,
          background: "var(--color-bg-base)",
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          Settings
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            data-testid="memory-settings-injection"
            type="checkbox"
            checked={settings?.injectionEnabled ?? true}
            onChange={(e) =>
              void updateSettings({ patch: { injectionEnabled: e.target.checked } })
            }
            disabled={!settings}
          />
          <span style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            Injection enabled
          </span>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            data-testid="memory-settings-learning"
            type="checkbox"
            checked={settings?.preferenceLearningEnabled ?? true}
            onChange={(e) =>
              void updateSettings({
                patch: { preferenceLearningEnabled: e.target.checked },
              })
            }
            disabled={!settings}
          />
          <span style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            Preference learning enabled
          </span>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            data-testid="memory-settings-privacy"
            type="checkbox"
            checked={settings?.privacyModeEnabled ?? false}
            onChange={(e) =>
              void updateSettings({
                patch: { privacyModeEnabled: e.target.checked },
              })
            }
            disabled={!settings}
          />
          <span style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            Privacy mode
          </span>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            Threshold
          </span>
          <input
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
            style={{
              width: 80,
              marginLeft: "auto",
              border: "1px solid var(--color-separator)",
              borderRadius: 6,
              padding: "2px 6px",
              background: "transparent",
              color: "var(--color-fg-muted)",
              fontSize: 12,
            }}
          />
        </label>
      </div>

      <div
        style={{
          border: "1px solid var(--color-separator)",
          borderRadius: 8,
          background: "var(--color-bg-base)",
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>Create</div>

        <div style={{ display: "flex", gap: 8 }}>
          <select
            data-testid="memory-create-type"
            value={createType}
            onChange={(e) => setCreateType(e.target.value as MemoryType)}
            style={{
              border: "1px solid var(--color-separator)",
              borderRadius: 6,
              padding: "4px 6px",
              background: "transparent",
              color: "var(--color-fg-muted)",
              fontSize: 12,
              flex: 1,
            }}
          >
            <option value="preference">preference</option>
            <option value="fact">fact</option>
            <option value="note">note</option>
          </select>

          <select
            data-testid="memory-create-scope"
            value={createScope}
            onChange={(e) => setCreateScope(e.target.value as MemoryScope)}
            style={{
              border: "1px solid var(--color-separator)",
              borderRadius: 6,
              padding: "4px 6px",
              background: "transparent",
              color: "var(--color-fg-muted)",
              fontSize: 12,
              flex: 1,
            }}
          >
            <option value="global">global</option>
            <option value="project" disabled={disabledProjectScope}>
              project
            </option>
          </select>
        </div>

        <textarea
          data-testid="memory-create-content"
          value={createContent}
          onChange={(e) => setCreateContent(e.target.value)}
          placeholder="Write a preference / fact / note..."
          style={{
            width: "100%",
            minHeight: 54,
            resize: "vertical",
            border: "1px solid var(--color-separator)",
            borderRadius: 8,
            padding: 10,
            background: "transparent",
            color: "var(--color-fg-base)",
            outline: "none",
            fontSize: 12,
            lineHeight: "18px",
          }}
        />

        <button
          data-testid="memory-create-submit"
          type="button"
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
          style={{
            border: "1px solid var(--color-separator)",
            background: "transparent",
            color: "var(--color-fg-muted)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      <div
        style={{
          border: "1px solid var(--color-separator)",
          borderRadius: 8,
          background: "var(--color-bg-base)",
          padding: 10,
          minHeight: 120,
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          Items ({items.length})
        </div>

        {items.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            No memories yet.
          </div>
        ) : null}

        {items.map((item) => (
          <div
            key={item.memoryId}
            data-testid={`memory-item-${item.memoryId}`}
            style={{
              border: "1px solid var(--color-separator)",
              borderRadius: 8,
              padding: 8,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  fontSize: 11,
                  color: "var(--color-fg-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>{item.type}</span>
                <span>{item.scope}</span>
                <span>{item.origin}</span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "var(--color-fg-base)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {item.content}
              </div>
            </div>
            <button
              data-testid={`memory-delete-${item.memoryId}`}
              type="button"
              onClick={() => void remove({ memoryId: item.memoryId })}
              style={{
                border: "1px solid var(--color-separator)",
                background: "transparent",
                color: "var(--color-fg-muted)",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          border: "1px solid var(--color-separator)",
          borderRadius: 8,
          background: "var(--color-bg-base)",
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            Injection preview
          </div>
          <button
            data-testid="memory-preview-run"
            type="button"
            onClick={() => void previewInjection({ queryText })}
            style={{
              marginLeft: "auto",
              border: "1px solid var(--color-separator)",
              background: "transparent",
              color: "var(--color-fg-muted)",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Preview
          </button>
          <button
            data-testid="memory-preview-clear"
            type="button"
            onClick={clearPreview}
            style={{
              border: "1px solid var(--color-separator)",
              background: "transparent",
              color: "var(--color-fg-muted)",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>

        <input
          data-testid="memory-preview-query"
          type="text"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="queryText (optional)"
          style={{
            width: "100%",
            border: "1px solid var(--color-separator)",
            borderRadius: 8,
            padding: "8px 10px",
            background: "transparent",
            color: "var(--color-fg-base)",
            outline: "none",
            fontSize: 12,
          }}
        />

        {preview ? (
          <div
            data-testid="memory-preview-result"
            style={{
              border: "1px solid var(--color-separator)",
              borderRadius: 8,
              padding: 8,
              fontSize: 12,
              color: "var(--color-fg-muted)",
            }}
          >
            <div>
              mode:{" "}
              <span style={{ fontFamily: "var(--font-mono)" }}>{preview.mode}</span>
            </div>
            <div style={{ marginTop: 6 }}>
              items:{" "}
              <span style={{ fontFamily: "var(--font-mono)" }}>
                {preview.items.length}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

