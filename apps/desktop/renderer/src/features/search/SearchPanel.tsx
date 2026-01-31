import React from "react";

import { useFileStore } from "../../stores/fileStore";
import { useSearchStore } from "../../stores/searchStore";

/**
 * SearchPanel is the minimal UI surface for full-text search (FTS).
 *
 * Why: CNWB-REQ-100 requires a usable search entry point and deterministic
 * errors that do not block the Workbench.
 */
export function SearchPanel(props: { projectId: string }): JSX.Element {
  const query = useSearchStore((s) => s.query);
  const items = useSearchStore((s) => s.items);
  const status = useSearchStore((s) => s.status);
  const lastError = useSearchStore((s) => s.lastError);

  const setQuery = useSearchStore((s) => s.setQuery);
  const runFulltext = useSearchStore((s) => s.runFulltext);
  const clearError = useSearchStore((s) => s.clearError);
  const setCurrent = useFileStore((s) => s.setCurrent);

  function onSubmit(e: React.FormEvent): void {
    e.preventDefault();
    void runFulltext({ projectId: props.projectId, limit: 20 });
  }

  return (
    <section
      data-testid="search-panel"
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
          Search
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--color-fg-muted)",
          }}
        >
          {status}
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
              data-testid="search-error-code"
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

      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          data-testid="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents…"
          style={{
            flex: 1,
            border: "1px solid var(--color-separator)",
            borderRadius: 8,
            padding: "6px 8px",
            background: "transparent",
            color: "var(--color-fg-muted)",
            fontSize: 12,
          }}
        />
        <button
          data-testid="search-run"
          type="submit"
          disabled={status === "loading"}
          style={{
            border: "1px solid var(--color-separator)",
            background: "transparent",
            color: "var(--color-fg-muted)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Go
        </button>
      </form>

      <div
        style={{
          border: "1px solid var(--color-separator)",
          borderRadius: 8,
          background: "var(--color-bg-base)",
          padding: 10,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {items.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            (no results)
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.documentId}
              type="button"
              onClick={() =>
                void setCurrent({
                  projectId: props.projectId,
                  documentId: item.documentId,
                })
              }
              style={{
                textAlign: "left",
                border: "1px solid var(--color-separator)",
                borderRadius: 8,
                padding: 10,
                background: "transparent",
                color: "var(--color-fg-muted)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-fg-default)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={item.title}
              >
                {item.title}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "var(--color-fg-muted)",
                  fontFamily: "var(--font-mono)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {item.snippet}
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
