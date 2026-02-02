# CommandPalette Spec

## Overview

CommandPalette 是一个快速命令/文件访问面板，通过 `Cmd/Ctrl+P` 打开。

## Visual Structure

```
┌──────────────────────────────────────────┐
│ 🔍  搜索命令或文件...                      │ ← Header (56px)
├──────────────────────────────────────────┤
│ RECENT FILES                             │
│ ●│ App.tsx               src/components  │ ← Active 项有左侧蓝条
│   package.json                           │
│ SUGGESTIONS                              │
│   Create New File                   ⌘N  │ ← 快捷键
│   Toggle Sidebar                    ⌘B  │
├──────────────────────────────────────────┤
│           ↑↓ 导航   ↵ 选择   esc 关闭     │ ← Footer (36px)
└──────────────────────────────────────────┘
```

## Design Tokens (from design reference)

- Width: `600px`
- Background: `--bg-modal` (#0f0f0f)
- Border: `1px solid #222222`
- Border radius: `12px`
- Shadow: `0 16px 32px rgba(0,0,0,0.6)`
- Header height: `56px`
- Footer height: `36px`
- Body max-height: `424px`
- Item height: `40px`
- Active indicator: `2px` blue bar on left (`#3b82f6`)

## Functional Requirements

### FR-1: Search Input

- Input field with search icon
- Placeholder: "搜索命令或文件..."
- Real-time filtering as user types
- Clear button (optional)

### FR-2: Grouped List

- Support multiple groups (e.g., "Recent Files", "Suggestions")
- Group title styling: uppercase, small text, muted color
- Items sorted by relevance within group

### FR-3: List Item

- Icon (colored by file type)
- Label text
- Optional subtext (file path)
- Optional shortcut badge

### FR-4: Active State

- One item active at a time
- Left border indicator (2px blue)
- Background highlight

### FR-5: Keyboard Navigation

- `↑` / `↓`: Move selection
- `Enter`: Execute selected command
- `Escape`: Close palette
- Focus trap within palette

### FR-6: Search Highlighting

- Highlight matched characters in item label
- Use `<mark>` or span with highlight class

## API

```typescript
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  subtext?: string;
  group?: string;
  onSelect: () => void;
}
```

## Scenarios

### S1: Default State

Given: User opens CommandPalette
Then: Shows Recent Files and Suggestions
And: First item is active

### S2: Search Filtering

Given: User types "set"
Then: List filters to matching items
And: Matched text is highlighted

### S3: Keyboard Navigation

Given: User presses ↓
Then: Selection moves to next item
Given: User presses Enter
Then: Selected command executes
And: Palette closes

### S4: Empty Results

Given: Search has no matches
Then: Shows empty state message
