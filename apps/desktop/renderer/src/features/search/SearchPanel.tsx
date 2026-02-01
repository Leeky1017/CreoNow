import React from "react";

import { Button } from "../../components/primitives/Button";
import { Card } from "../../components/primitives/Card";
import { Input } from "../../components/primitives/Input";
import { Text } from "../../components/primitives/Text";
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
      className="flex flex-col gap-3 p-3 min-h-0"
    >
      <header className="flex items-center gap-2">
        <Text size="small" color="muted">
          Search
        </Text>
        <Text size="tiny" color="muted" className="ml-auto">
          {status}
        </Text>
      </header>

      {lastError ? (
        <Card className="p-2.5 rounded-[var(--radius-md)]">
          <div className="flex items-center gap-2">
            <Text data-testid="search-error-code" size="code" color="muted">
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
          <Text size="small" color="muted" as="div" className="mt-1.5">
            {lastError.message}
          </Text>
        </Card>
      ) : null}

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          data-testid="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents…"
          className="flex-1"
        />
        <Button
          data-testid="search-run"
          type="submit"
          variant="secondary"
          size="sm"
          disabled={status === "loading"}
        >
          Go
        </Button>
      </form>

      <Card className="p-2.5 rounded-[var(--radius-md)] min-h-0 overflow-auto flex flex-col gap-2.5">
        {items.length === 0 ? (
          <Text size="small" color="muted">
            (no results)
          </Text>
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
              className="text-left border border-[var(--color-border-default)] rounded-[var(--radius-md)] p-2.5 bg-transparent hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-default)] focus-visible:outline focus-visible:outline-[length:var(--ring-focus-width)] focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-ring-focus)]"
            >
              <Text
                size="small"
                as="div"
                className="overflow-hidden text-ellipsis whitespace-nowrap"
                title={item.title}
              >
                {item.title}
              </Text>
              <Text
                size="code"
                color="muted"
                as="div"
                className="mt-1.5 whitespace-pre-wrap break-words"
              >
                {item.snippet}
              </Text>
            </button>
          ))
        )}
      </Card>
    </section>
  );
}
