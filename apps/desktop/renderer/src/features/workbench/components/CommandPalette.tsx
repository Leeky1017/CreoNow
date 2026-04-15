import { Search } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";

export type CommandPaletteGroup = "navigation" | "scenarios" | "documents" | "actions";

export interface CommandPaletteItem {
  id: string;
  description?: string;
  group: CommandPaletteGroup;
  keywords?: string[];
  label: string;
}

interface CommandPaletteProps {
  emptyLabel: string;
  groupLabels: Record<CommandPaletteGroup, string>;
  items: CommandPaletteItem[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (item: CommandPaletteItem) => void;
  open: boolean;
  placeholder: string;
  query: string;
  shortcutHint: string;
  title: string;
}

const GROUP_ORDER: CommandPaletteGroup[] = ["navigation", "scenarios", "documents", "actions"];

function matchesQuery(item: CommandPaletteItem, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }

  const searchable = [
    item.label,
    item.description ?? "",
    ...(item.keywords ?? []),
  ].join(" ").toLowerCase();

  return searchable.includes(normalizedQuery);
}

export function CommandPalette(props: CommandPaletteProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const normalizedQuery = props.query.trim().toLowerCase();

  const groupedItems = useMemo(() => {
    const next = new Map<CommandPaletteGroup, CommandPaletteItem[]>();
    for (const group of GROUP_ORDER) {
      next.set(group, []);
    }

    for (const item of props.items) {
      if (matchesQuery(item, normalizedQuery) === false) {
        continue;
      }

      next.get(item.group)?.push(item);
    }

    return next;
  }, [props.items, normalizedQuery]);

  const hasResults = Array.from(groupedItems.values()).some((items) => items.length > 0);

  useEffect(() => {
    if (props.open === false) {
      return;
    }

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      previousActiveElement?.focus();
    };
  }, [props.open]);

  if (props.open === false) {
    return null;
  }

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
    );
    if (!focusable || focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (event.shiftKey === false && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <div className="command-palette-backdrop" onMouseDown={props.onClose}>
    <section
      aria-label={props.title}
      aria-modal="true"
      className="command-palette"
      onKeyDown={handleDialogKeyDown}
      onMouseDown={(event) => event.stopPropagation()}
      ref={dialogRef}
      role="dialog"
    >
      <header className="command-palette__header">
        <div className="command-palette__title-row">
          <h2 className="command-palette__title">{props.title}</h2>
          <span className="command-palette__shortcut">{props.shortcutHint}</span>
        </div>
        <label className="command-palette__input-wrap" htmlFor="command-palette-input">
          <Search className="command-palette__search-icon" size={16} aria-hidden="true" />
          <Input
            id="command-palette-input"
            autoFocus
            value={props.query}
            placeholder={props.placeholder}
            onChange={(event) => props.onQueryChange(event.target.value)}
          />
        </label>
      </header>

      <div className="command-palette__results">
        {hasResults ? GROUP_ORDER.map((group) => {
          const items = groupedItems.get(group);
          if (!items || items.length === 0) {
            return null;
          }

          return <section key={group} className="command-palette__group" aria-label={props.groupLabels[group]}>
            <p className="command-palette__group-title">{props.groupLabels[group]}</p>
            <div className="command-palette__group-items">
              {items.map((item) => (
                <Button
                  key={item.id}
                  className="command-palette__item"
                  tone="ghost"
                  onClick={() => props.onSelect(item)}
                >
                  <span className="command-palette__item-label">{item.label}</span>
                  {item.description ? <span className="command-palette__item-description">{item.description}</span> : null}
                </Button>
              ))}
            </div>
          </section>;
        }) : <p className="command-palette__empty">{props.emptyLabel}</p>}
      </div>
    </section>
  </div>;
}
