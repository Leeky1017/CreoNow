> ⚠️ **已归档**：本文件的有效内容已整合至 `docs/references/frontend-visual-quality.md`。技术栈决策以 `AGENTS.md` P-V 章节为准。仅保留做历史溯源参考。

---

# CreoNow Frontend Agent Spec

This is the canonical, Agent-consumable specification for CreoNow (CN) frontend development. Every rule is a hard constraint unless marked TODO.

Source: [CreoNow 前端构想（语音记录）](https://www.notion.so/CreoNow-c0d5c464109a45fdb9f6772101b48999?pvs=21)

---

## 1. Product Identity

- **Product:** CreoNow (CN)
- **Type:** Agent-native creative writing IDE
- **Runtime:** Electron (Chromium + Node.js). Desktop only.
- **Platform priority:** Windows First, macOS second.
- **Philosophy:** Less is More. Complexity in engineering, simplicity in UI.
- **Benchmarks:** Cursor (minimalism), Notion (density + cleanliness).

---

## 2. Hard Constraints

- **NO "AI" in any user-facing text.** Use "Agent" or action verbs (润色, 扩写, 翻译). Never use AI / LLM / 模型.
- **NO Block architecture.** Continuous text + semantic spans. ProseMirror only (not TipTap, not Lexical).
- **NO purple, blue, or gold** in UI. Banned "AI aesthetic" colors.
- **Black-and-white only** for core UI. Color allowed only where it encodes data (KG nodes, Memory tags, Search types).
- **SKILL is always UPPERCASE.** Never "Skill" or "skill".
- **NO ambiguous phrasing.** Every decision is singular. Never "A or B".
- **File-based storage.** Content never locked in proprietary format. Import/export is first-class.
- **Electron app.** Use BrowserWindow, IPC, Node.js fs, Worker threads.

---

## 3. Tech Stack

- Editor engine: **ProseMirror** (direct, no wrapper)
- State: **Zustand**
- Components: **Radix + shadcn/ui** (80%) + **React Aria** hooks (20%)
- Styling: **Tailwind CSS** + CSS Custom Properties (`--cn-{category}-{name}`)
- Animation: **Framer Motion**
- Shell: **Electron**
- Text measurement (Round 5+): **Pretext** (`@chenglou/pretext`)
- Fonts: UI = Inter | Body = Lora + Source Han Serif SC | Mono = JetBrains Mono

---

## 4. Layout

```
┌───┬────────┬──────────────────────────┬──────────────┐
│   │        │  Top Bar (INSIDE editor)  │              │
│ I │  Left  ├──────────────────────────┤    Right     │
│ c │  Side  │                          │    Side      │
│ o │  Panel │     Main Editor          │    Panel     │
│ n │        │     (ProseMirror)        │   (Agent)    │
│   │        │                          │              │
│ B │        │                          │              │
│ a │        │                          │              │
│ r │        │                          │              │
├───┴────────┴──────────────────────────┴──────────────┤
│  Status Bar                                          │
└──────────────────────────────────────────────────────┘
```

### Rules

- **Top Bar is INSIDE Main Editor**, not spanning full window.
- **Icon Bar**: leftmost, narrow, icons only, full height. Click → expand Left Panel or open Command Palette.
- **Left Side Panel**: collapsible, full height. File tree, worldbuilding, outline, etc.
- **Right Side Panel**: Agent Panel. Full height.
- **Status Bar**: always visible. Word count, current heading, save status, project mode.
- **Tab**: exactly 1 (current file). Click → File Switcher List popup.

### Three presentation modes

1. **Side Panel** — file tree, character list, worldbuilding tree
2. **Command Palette** — center popup for search/commands
3. **Full Editor View** — tool replaces Main Editor (KG canvas, Characters, Settings)

---

## 5. Agent Panel — Three Forms

### Side Panel (FAB single-click)

- Right sidebar, 360-400px wide
- Editor shifts left. Use case: quick chat, Diff preview.

### Full Panel (FAB double-click)

- Near full-screen overlay
- Use case: deep conversation, multi-turn reasoning, complex tasks

### Mini Panel (Ctrl+Shift+A)

- Center popup, ~480×320px
- One instruction → auto-close. Supports @ references.

### State sharing

- All three share **one Zustand store** (conversation history).
- Side ↔ Full: expand/collapse button. Context continuous.
- Mini Panel: independent entry, does not affect Side/Full.

---

## 6. Editor Interactions

### Floating Toolbar (text selection)

- Format tools: bold, underline, color, link, delete
- SKILL shortcuts: 润色, 翻译, 扩写, 缩写 (action verbs, no "AI" prefix)
- Inline Agent input: natural language → Agent edits selection in-place
- Diff preview (green/red). User accepts/rejects.
- Must preserve ProseMirror selection when clicking toolbar.

### Context Menu (right-click)

- **Custom HTML/CSS.** NOT Electron native Menu API.
- Framer Motion: `scale 0.95→1`, `opacity 0→1`, `duration 0.12s`, `ease [0.2, 0, 0, 1]`
- Notion-style visual. Icon-based items + hover tooltips.
- Frequency-based auto-sorting, window = **最近 1 天**. Tool items pinned.
- Agent operations: fixed order (muscle memory).
- Translation: i18n system → small panel ("翻译为中文" / "翻译为英文").

### FAB (bottom-right)

- Single-click → Side Panel. Double-click → Full Panel.
- Animated feedback when Agent is thinking.

---

## 7. Zen Mode

A **skin overlay**, not a separate mode. Same ProseMirror instance, same doc, same state. Only CSS Tokens and UI visibility change.

### Screen content

- Full-screen (`BrowserWindow.setFullScreen(true)`)
- Content centered, ~680px wide
- Zen tokens: font 20px, line-height 1.9+, generous spacing
- All Shell elements hidden

### Three elements only

**1) Editor** (center, full-screen)

**2) Capsule Input** (bottom center)

- Pill shape. 32px from bottom edge.
- Default: ~280px × 44px, near-invisible (faint border, backdrop blur)
- Horizontal expand: grows with text, max **30% screen width** (~400-420px)
- Vertical expand: wraps upward (bottom fixed), max **4 lines** (~140px), then scrolls
- Send (Enter): shrink to 280×44, 150ms
- All transitions: CSS, ~100ms

**3) Tool Orb** (top-left)

- ~28px circle, near-invisible default
- Click → toolbar expands **rightward**: font switcher, paragraph focus toggle, typewriter mode toggle, exit Zen
- Click outside → collapse

### Enter/Exit

- Enter: Cmd+Shift+Z / Ctrl+Shift+Z
- Exit: Esc or Orb exit button
- Transition: ~300ms, all panels fade/shrink, editor fills screen
- Cursor + scroll position preserved

---

## 8. Visual Design

### Theme

- Two themes: Dark + Light. Mirror images (black↔white swap).
- Dark: black bg, white text, white highlights
- Light: white bg, black text, black highlights

### Design Tokens

- Naming: `--cn-{category}-{name}` (e.g. `--cn-bg-surface`, `--cn-radius-md`, `--cn-shadow-float`)
- **Never hardcode** color, spacing, radius, or shadow. Always reference tokens.
- Token spec file: `.cn/design-system.md` (auto-loaded as Agent context)

### Reference values

- Border radius: `8px` (Notion-style soft)
- Shadow float: `0 4px 16px rgba(0,0,0,0.12)`
- Hover bg: `#F7F7F7` (light) / `#3A3A3A` (dark)
- Transition: `120ms` (Notion standard)
- Font sizes (max 4 levels): 12px (aux), 14px (body/menu), 16px (title), 20px (large title)

### Framer Motion standards

- Menu popup: `scale 0.95→1`, `opacity 0→1`, `0.12s`, `ease [0.2, 0, 0, 1]`
- Button press: `scale 0.98` via `whileTap`, spring bounce
- Panel expand: child stagger `20ms` per item
- Tooltip: `300ms` delay, `0.1s` fade in
- Page transition: `opacity` + `y` shift, `0.15s`

---

## 9. Architecture: No-Block Model

Ref: [AI Native 内容架构——结构层与呈现层设计](https://www.notion.so/AI-Native-ed448a12b11c4705a8e549aaacc72b82?pvs=21)

### Three layers

1. **Semantic layer** — continuous text + semantic spans. No Block objects.
2. **Structural layer** — AST auto-derived (paragraphs, headings, lists). Tree-sitter for prose.
3. **Presentation layer** — AST → DOM. Looks like Notion visually. No Block overhead.

### ProseMirror rules

- All edits (insert, delete, replace, move) = ProseMirror **Transactions**.
- Incremental update: only changed DOM nodes touched. Cost ∝ change size, not doc size.
- Agent writes: direct Transaction. Append text, replace range — no Block creation.
- Delete: "remove chars position X→Y". No "find and delete Block".

---

## 10. Component Library

### shadcn/ui (Radix) components

Dialog, Sheet, DropdownMenu, Command (cmdk), Tooltip, Popover, Toggle, Switch, Tabs, ScrollArea, Separator, Slider, Select, Input, Textarea

### React Aria hooks (supplement)

For finer keyboard nav / a11y: `useMenu()`, `useComboBox()`

### Custom-built (no library)

- ProseMirror editor core
- Floating Toolbar (Selection API integration)
- Capsule Input (dynamic sizing)
- Tool Orb + expanding toolbar
- Navigation Outline (TOC)
- Knowledge Graph canvas (React Flow / D3)
- Diff View
- File Switcher List

### Quality pipeline

1. Agent generates `.tsx` + Tailwind + Framer Motion
2. Agent → Figma MCP → design comp (all states: default, hover, pressed, disabled, dark)
3. Agent → Storybook Story
4. User reviews Figma + Storybook → natural language feedback
5. Agent iterates → lock as **Golden Example**
6. Golden Examples (5 core): Button, Dialog, DropdownMenu, Tooltip, Input

### Code rules

- Strict TypeScript. No `any`.
- Variants: union type enum (`'primary' | 'ghost' | 'danger'`)
- All visual values: Token refs only. ESLint: `no-hardcoded-colors`, `no-hardcoded-spacing`.
- Every component: full Storybook coverage (all states × both themes).

---

## 11. Knowledge Base

KG, Memory, Characters, Worldbuilding = **same system, different viewports**.

- **Knowledge Graph**: bottom layer. All entities + relationships.
- **Characters**: KG filtered to character entities.
- **Worldbuilding**: KG filtered to settings (places, eras, rules, tech).
- **Memory**: cross-cutting — user prefs, project context, conversation history, KG summaries.

### Memory rules

- Auto-generated by Agent + user can view/edit/delete any entry.
- User has full control. CN serves the user, not the Agent.

---

## 12. Outline System

### Creative Outline (Full Editor View)

- Project-level heavy tool. Volume → Chapter → Scene → Conflict → Motivation.
- Scene Cards with metadata (POV, location, time, conflict, foreshadowing).
- Plot Lines visualization.
- **Bidirectional sync**: Outline → draft. Text → outline auto-update.

### Navigation Outline (editor-attached TOC)

- Position: right edge of Main Editor (inside container, not separate panel).
- Responsive: shrinks with editor when Right Panel opens.
- **Collapsed** (default): faint gray lines. Length/indent = heading level. Current heading highlighted.
- **Expanded** (hover): lines → heading text, ~150-200ms ease-out. Click to scroll.
- Data: ProseMirror doc `heading` nodes. Auto-update on Transaction.
- ~200-300 lines React component, IntersectionObserver for scroll sync.

---

## 13. Writing Style & Tone

- **Project-level**: global tone for entire project.
- **Paragraph-level**: per-section style within one doc.
- **Style = SKILL**: style templates are SKILL entries. Presets: 严肃文学, 网文爽文, 商业文案, 学术论文. User refines.
- **Style ≠ Personality**: Style → generated content. Personality → Agent dialog tone. Separate settings.

---

## 14. Project Management

- Multi-project via Top Bar. Each project = independent workspace.
- Editor state saved/restored per project. Agent Memory follows project.

### Project modes

- **Novel**: Characters, Worldbuilding, KG, Creative Outline, plot lines, timeline
- **Copywriting**: candidate generation, word limits, audience, fast style switching
- **Academic**: citation management, footnotes, reference formats, logic outline
- **General**: minimal defaults, user enables features as needed
- **Custom**: user-defined tool combinations

---

## 15. Version & Collaboration

### Version History (V1 must-have)

- Every save / Agent edit = snapshot.
- Version list, Diff between any two versions, rollback, manual naming.

### Fork (V1 can-do)

- **Author Fork**: branch for alternate plot exploration.
- **Community Fork**: readers Fork, Patch (PR-style), Rewrite, Fork Tree.
- **Permission model**: Public (anyone forks), Restricted, Private.

### Real-time Collaboration — TODO

- Not V1. Architecture must reserve interfaces.

---

## 16. Import / Export

- Export: Markdown, Word (.docx), Plain Text, PDF. Future: ePub, LaTeX.
- Import: same formats.
- Agent assists formatting on export (auto-layout, heading levels, orphan check).

---

## 17. Additional Systems

### Search

- Command Palette = global search. Covers files, commands, entities, settings.

### Keyboard shortcuts

- See 平台策略与快捷键 section in source doc.

### Data persistence

- Local-first, file-based. Node.js fs for read/write.

### Undo/Redo

- ProseMirror `prosemirror-history` plugin. Granular undo.

### Notifications

- Minimal, non-intrusive. Toast-style.

### Drag & Drop

- File tree reorder. Document structure reorder in Creative Outline.

### Agent streaming output

- ProseMirror Transactions for incremental render. No full-page re-render.
- See [AI 流式写入防护策略](https://www.notion.so/AI-4197d1f3de8648aba9f54e7409a12110?pvs=21)

### Error handling & degradation

- Agent failure: graceful fallback, user can undo.
- Network failure: local-first, queue sync.

### Large documents

- Virtual scrolling for 100k+ word docs.
- Heavy compute (diff, search index) offloaded to Electron main process / Worker.

### Accessibility

- React Aria for a11y-critical components.
- Keyboard navigation for all menus and panels.

### i18n

- System-level i18n. Chinese + English minimum.

### Performance budget

- First paint < 1s. Editor interaction < 16ms (60fps). Agent stream render < 32ms.

### Window management

- Max 3 windows. Electron BrowserWindow + IPC sync.

### Plugin architecture

- V1: not open. Reserve extension points in architecture.
- Plugin types: Codex CLI plugin (Agent capability), Claude Code plugin/SKILL, CN plugin (product-level extension).

---

## 18. Reading Experience Strategy

### Principle: open data, best-in-class native experience

- Data is never locked (file-based, full import/export).
- Retention through experience quality, not data lock-in.

### Implementation roadmap

1. **Design Token typography tuning** (Round 1-2): body 16-18px, line-height 1.6-1.8, modular scale headings
2. **Reading Mode** (Round 3-4): `editable: false` + reading CSS tokens, panels auto-collapse, content centered
3. **Multi-render pipeline** (Round 5+): Outline Mode, Paginated Mode (Kindle-style), Presentation Mode
4. **High-fidelity export** (Round 5+): Puppeteer PDF, ePub with CN tokens, Agent auto-fix orphans

---

## 19. Pretext Integration (Round 5+)

- Library: `@chenglou/pretext` v0.0.2 by chenglou
- Use cases: export layout (PDF/ePub pagination), paginated reading mode, KG node text measurement, large doc virtualization
- NOT used for: ProseMirror daily editing or Agent streaming (ProseMirror handles those)
- Benchmark: 53% speedup, 170k+ DOM queries saved on 3166 text nodes

---

## 20. DO / DON'T Checklist

### DO

- Use ProseMirror Transactions for all editor operations
- Use `--cn-*` tokens for every visual value
- Use Framer Motion for every state transition
- Use action verbs for SKILL buttons (润色, 翻译, 扩写)
- Use Inter for UI; Lora + Source Han Serif SC for body
- Write strict TypeScript with no `any`
- Generate Storybook Stories for every component
- Keep Zen Mode as a CSS skin swap, not a separate mode
- Use custom HTML/CSS for context menus
- Reserve plugin architecture extension points

### DON'T

- Don't use "AI", "LLM", or "模型" in any UI text
- Don't use Block architecture
- Don't use TipTap or Lexical
- Don't use Electron native Menu API for context menus
- Don't use purple, blue, or gold colors
- Don't hardcode any visual values (use tokens)
- Don't write "A or B" in specs — pick one
- Don't write "Skill" or "skill" — always SKILL
- Don't use emoji, callouts, or colored elements in spec docs (exported to VSCode for Agent consumption)
- Don't use Focus Mode as a term — use "段落聚焦" as Zen Mode sub-feature
- Don't call the product a web app — it's Electron desktop
- Don't open plugin system in V1