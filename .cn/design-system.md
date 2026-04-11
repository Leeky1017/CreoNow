# CreoNow (CN) Design System Rules

> **Source of truth**: Figma file「CreoNow黄金组件」— all token values extracted directly from Figma Variables.
> **Figma 链接**: https://www.figma.com/design/qgCo8ZV53IUGlYRbElaYv5/CreoNow黄金组件?node-id=169-3
> This file is auto-loaded as Agent context. AI coding agents (Claude Code, Cursor, Copilot) should read this before writing any frontend code.

---

## 1. Brand Identity

- **Product**: CreoNow (CN) — Agent-native creative writing IDE
- **Visual philosophy**: Less is More. Extreme minimalism. Notion-level cleanliness + Cursor-level restraint.
- **Color stance**: Pure black & white. Color is ONLY allowed where it encodes data (e.g. Knowledge Graph nodes). Core UI is monochrome.
- **BANNED colors**: Purple, blue, gold — these are "AI aesthetic" and strictly forbidden.

---

## 2. Color Tokens

All CSS Custom Properties follow `--cn-{category}-{name}` pattern.

### 2.1 Semantic Color Tokens (Light / Dark)

| Token | CSS Variable | Light Value | Dark Value |
|-------|-------------|-------------|------------|
| Background surface | `--cn-bg-surface` | `#FFFFFF` | `#1A1A1A` |
| Background hover | `--cn-bg-hover` | `#F7F7F7` | `#3A3A3A` |
| Text primary | `--cn-text-primary` | `#1A1A1A` | `#FFFFFF` |
| Text secondary | `--cn-text-secondary` | `rgba(26,26,26,0.6)` | `rgba(255,255,255,0.6)` |
| Text placeholder | `--cn-text-placeholder` | `rgba(26,26,26,0.4)` | `rgba(255,255,255,0.4)` |
| Text disabled | `--cn-text-disabled` | `rgba(26,26,26,0.3)` | `rgba(255,255,255,0.3)` |
| Accent | `--cn-accent` | `#000000` | `#FFFFFF` |
| Border default | `--cn-border-default` | `rgba(0,0,0,0.12)` | `rgba(255,255,255,0.12)` |
| Border focus | `--cn-border-focus` | `#000000` | `#FFFFFF` |
| Danger | `--cn-danger` | `#D63030` | `#CC4444` |
| Danger background | `--cn-danger-bg` | `#FDE8E8` | `#CC4444` |
| Tooltip background | `--cn-tooltip-bg` | `#1A1A1A` | `#F5F5F5` |
| Tooltip text | `--cn-tooltip-text` | `#FFFFFF` | `#1A1A1A` |
| Overlay | `--cn-overlay` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.5)` |
| Separator | `--cn-separator` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |

### 2.2 Primitive Color Tokens (internal — do not reference in components)

| Token | Value | Notes |
|-------|-------|-------|
| `--cn-prim-white` | `#FFFFFF` | Light bg base |
| `--cn-prim-black` | `#000000` | Accent base |
| `--cn-prim-dark` | `#1A1A1A` | Dark bg base |
| `--cn-prim-gray-hover-light` | `#F7F7F7` | Light hover |
| `--cn-prim-gray-hover-dark` | `#3A3A3A` | Dark hover |
| `--cn-prim-gray-tooltip-inv` | `#F5F5F5` | Tooltip bg (dark mode) |
| `--cn-prim-gray-separator` | `#E5E5E5` | Separator line |
| `--cn-prim-red-500` | `#D63030` | Danger (light) |
| `--cn-prim-red-100` | `#FDE8E8` | Danger bg (light) |
| `--cn-prim-red-900` | `#CC4444` | Danger (dark) |

### 2.3 CSS Custom Properties Declaration

```css
:root {
  /* -- Surface & Background -- */
  --cn-bg-surface: #FFFFFF;
  --cn-bg-hover: #F7F7F7;

  /* -- Text -- */
  --cn-text-primary: #1A1A1A;
  --cn-text-secondary: rgba(26, 26, 26, 0.6);
  --cn-text-placeholder: rgba(26, 26, 26, 0.4);
  --cn-text-disabled: rgba(26, 26, 26, 0.3);

  /* -- Accent & Border -- */
  --cn-accent: #000000;
  --cn-border-default: rgba(0, 0, 0, 0.12);
  --cn-border-focus: #000000;

  /* -- Danger -- */
  --cn-danger: #D63030;
  --cn-danger-bg: #FDE8E8;

  /* -- Tooltip -- */
  --cn-tooltip-bg: #1A1A1A;
  --cn-tooltip-text: #FFFFFF;

  /* -- Overlay & Separator -- */
  --cn-overlay: rgba(0, 0, 0, 0.5);
  --cn-separator: rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] {
  --cn-bg-surface: #1A1A1A;
  --cn-bg-hover: #3A3A3A;

  --cn-text-primary: #FFFFFF;
  --cn-text-secondary: rgba(255, 255, 255, 0.6);
  --cn-text-placeholder: rgba(255, 255, 255, 0.4);
  --cn-text-disabled: rgba(255, 255, 255, 0.3);

  --cn-accent: #FFFFFF;
  --cn-border-default: rgba(255, 255, 255, 0.12);
  --cn-border-focus: #FFFFFF;

  --cn-danger: #CC4444;
  --cn-danger-bg: #CC4444;

  --cn-tooltip-bg: #F5F5F5;
  --cn-tooltip-text: #1A1A1A;

  --cn-overlay: rgba(0, 0, 0, 0.5);
  --cn-separator: rgba(255, 255, 255, 0.08);
}
```

---

## 3. Typography

### 3.1 Font Families

| Role | Family | Fallback | Usage |
|------|--------|----------|-------|
| UI | Inter | system-ui, sans-serif | Menus, buttons, labels, all UI chrome |
| Body / Editor | Lora + Source Han Serif SC | Noto Serif SC, serif | Lora for Latin, Source Han Serif SC for CJK |
| Monospace | JetBrains Mono | Fira Code, Consolas, monospace | Code blocks, terminal |

```css
:root {
  --cn-font-ui: "Inter", system-ui, -apple-system, sans-serif;
  --cn-font-body: "Lora", "Source Han Serif SC", "Noto Serif SC", serif;
  --cn-font-mono: "JetBrains Mono", "Fira Code", Consolas, monospace;
}
```

### 3.2 Type Scale (max 4 levels)

| Token | CSS Variable | Size | Line Height | Weight | Usage |
|-------|-------------|------|-------------|--------|-------|
| Auxiliary | `--cn-text-xs` | 12px | 16px | 400 (Regular) | Labels, captions, helper text |
| Body | `--cn-text-sm` | 14px | 20px | 400 (Regular) | Body copy, menu items, inputs |
| Title | `--cn-text-base` | 16px | 22px | 600 (Semi Bold) | Section headings, dialog titles |
| Large Title | `--cn-text-lg` | 20px | 28px | 600 (Semi Bold) | Page headings, -0.5% tracking |

```css
:root {
  --cn-text-xs: 12px;
  --cn-text-sm: 14px;
  --cn-text-base: 16px;
  --cn-text-lg: 20px;

  --cn-leading-xs: 16px;
  --cn-leading-sm: 20px;
  --cn-leading-base: 22px;
  --cn-leading-lg: 28px;
}
```

---

## 4. Spacing Scale

Base unit: **4px**. All spacing uses multiples of 4.

| Token | CSS Variable | Value |
|-------|-------------|-------|
| Space 1 | `--cn-space-1` | 4px |
| Space 2 | `--cn-space-2` | 8px |
| Space 3 | `--cn-space-3` | 12px |
| Space 4 | `--cn-space-4` | 16px |
| Space 6 | `--cn-space-6` | 24px |
| Space 8 | `--cn-space-8` | 32px |

```css
:root {
  --cn-space-1: 4px;
  --cn-space-2: 8px;
  --cn-space-3: 12px;
  --cn-space-4: 16px;
  --cn-space-6: 24px;
  --cn-space-8: 32px;
}
```

---

## 5. Border Radius

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| Small | `--cn-radius-sm` | 4px | Tags, badges, small chips |
| Medium | `--cn-radius-md` | 8px | Buttons, cards, dialogs, menus, inputs |
| Large | `--cn-radius-lg` | 12px | Large cards, panels |
| Full | `--cn-radius-full` | 9999px | Pills, avatar circles |

```css
:root {
  --cn-radius-sm: 4px;
  --cn-radius-md: 8px;
  --cn-radius-lg: 12px;
  --cn-radius-full: 9999px;
}
```

---

## 6. Shadows

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| Float | `--cn-shadow-float` | `0 4px 16px rgba(0,0,0,0.12)` | Dropdowns, tooltips, menus, popovers |
| Overlay | `--cn-shadow-overlay` | `0 8px 32px rgba(0,0,0,0.24)` | Dialog backdrop, modal panels |

```css
:root {
  --cn-shadow-float: 0 4px 16px rgba(0, 0, 0, 0.12);
  --cn-shadow-overlay: 0 8px 32px rgba(0, 0, 0, 0.24);
}
```

---

## 7. Animation & Transitions

### 7.1 Duration Tokens

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| Fast | `--cn-duration-fast` | 80ms | Micro-interactions, color changes |
| Normal | `--cn-duration-normal` | 120ms | Menu open/close, standard transitions |
| Slow | `--cn-duration-slow` | 300ms | Tooltip delay, panel expand, page transitions |

### 7.2 Easing Curves

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| Default | `--cn-ease-default` | `cubic-bezier(0.2, 0, 0, 1)` | Most UI transitions |
| Spring | `--cn-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy elements (button release) |
| Out | `--cn-ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Exit animations |

### 7.3 Framer Motion Presets

```typescript
export const cnMotion = {
  menuPopup: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { duration: 0.12, ease: [0.2, 0, 0, 1] },
  },
  buttonPress: {
    whileTap: { scale: 0.98 },
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
  tooltip: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.1, delay: 0.3 },
  },
  panelExpand: {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    transition: { duration: 0.3, ease: [0.2, 0, 0, 1] },
  },
} as const;
```

```css
:root {
  --cn-duration-fast: 80ms;
  --cn-duration-normal: 120ms;
  --cn-duration-slow: 300ms;
  --cn-ease-default: cubic-bezier(0.2, 0, 0, 1);
  --cn-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --cn-ease-out: cubic-bezier(0, 0, 0.2, 1);
}
```

---

## 8. Z-Index Scale

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| Base | `--cn-z-base` | 0 | Default content |
| Dropdown | `--cn-z-dropdown` | 100 | Dropdown menus, popovers |
| Overlay | `--cn-z-overlay` | 200 | Dialog backdrop overlay |
| Modal | `--cn-z-modal` | 300 | Dialog container, sheets |
| Tooltip | `--cn-z-tooltip` | 400 | Tooltips (always on top) |

```css
:root {
  --cn-z-base: 0;
  --cn-z-dropdown: 100;
  --cn-z-overlay: 200;
  --cn-z-modal: 300;
  --cn-z-tooltip: 400;
}
```

---

## 9. Component Rules

### 9.1 Button

**Variants**: `primary` | `ghost` | `danger`
**Sizes**: `sm` (28px) | `md` (36px) | `lg` (44px)

```typescript
interface ButtonProps {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

| Property | Primary | Ghost | Danger |
|----------|---------|-------|--------|
| Background (default) | `--cn-accent` | transparent | `--cn-danger` |
| Background (hover) | `--cn-accent` (90% opacity) | `--cn-bg-hover` | `--cn-danger` (90% opacity) |
| Text color | inverse of accent | `--cn-text-primary` | `#FFFFFF` |
| Border | none | 1px `--cn-border-default` | none |
| Border (hover) | none | 1px rgba at 20% | none |
| Disabled | 30% opacity, no pointer | 30% opacity, no pointer | 30% opacity, no pointer |
| Press (whileTap) | scale 0.98 | scale 0.98 | scale 0.98 |

| Size | Height | Font Size | Padding (horizontal) |
|------|--------|-----------|---------------------|
| sm | 28px | `--cn-text-xs` (12px) | `--cn-space-3` (12px) |
| md | 36px | `--cn-text-sm` (14px) | `--cn-space-4` (16px) |
| lg | 44px | `--cn-text-base` (16px) | `--cn-space-6` (24px) |

All buttons use `--cn-radius-md` (8px).

### 9.2 Dialog

**Sub-variants**: `base` | `with-close` | `long-content` | `single-action`

```typescript
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  actions?: React.ReactNode;
}
```

| Element | Token |
|---------|-------|
| Overlay | `--cn-overlay` + `backdrop-filter: blur(4px)` |
| Container background | `--cn-bg-surface` |
| Container radius | `--cn-radius-md` (8px) |
| Container shadow | `--cn-shadow-float` |
| Container max-width | 480px |
| Header padding | `--cn-space-6` horizontal, `--cn-space-4` vertical |
| Title | `--cn-text-base` (16px), Semi Bold, `--cn-text-primary` |
| Body padding | `--cn-space-6` horizontal, `--cn-space-4` vertical |
| Body text | `--cn-text-sm` (14px), `--cn-text-primary` |
| Footer padding | `--cn-space-4` all sides |
| Footer alignment | flex, justify-end, gap `--cn-space-2` |
| Separator | 1px `--cn-separator` |
| Open animation | scale 0.95→1, opacity 0→1, 150ms, `--cn-ease-default` |
| Long content body | height capped at 160px, clip overflow, gradient fade to `--cn-bg-surface`, scrollbar indicator (4px, 30% opacity) |
| Z-index | overlay: `--cn-z-overlay`, container: `--cn-z-modal` |

### 9.3 DropdownMenu

```typescript
interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode; // MenuItems
}

interface MenuItemProps {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
}
```

| Element | Token |
|---------|-------|
| Trigger style | Ghost button (use Button ghost variant) |
| Menu background | `--cn-bg-surface` |
| Menu radius | `--cn-radius-md` (8px) |
| Menu shadow | `--cn-shadow-float` |
| Menu min-width | 200px |
| Menu padding | `--cn-space-1` (4px) vertical |
| Item height | 36px |
| Item padding | `--cn-space-3` (12px) horizontal |
| Item text | `--cn-text-sm` (14px), `--cn-text-primary` |
| Item icon | 16px, left-aligned, `--cn-text-secondary` |
| Item hover | `--cn-bg-hover` background |
| Separator | 1px `--cn-separator`, margin `--cn-space-1` vertical |
| Open animation | scale 0.95→1, opacity 0→1, 120ms, children stagger 20ms |
| Z-index | `--cn-z-dropdown` |

**Keyboard behavior**: Arrow keys navigate, Enter selects, Escape closes. Focus follows active item.

### 9.4 Tooltip

```typescript
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delayMs?: number; // default 300
}
```

| Element | Token |
|---------|-------|
| Background | `--cn-tooltip-bg` |
| Text color | `--cn-tooltip-text` |
| Text size | `--cn-text-xs` (12px) |
| Padding | 6px 10px |
| Radius | 6px |
| Max width | 240px (text wraps) |
| Arrow | optional, 4px |
| Appear delay | 300ms |
| Fade in | 100ms |
| Z-index | `--cn-z-tooltip` |

### 9.5 Input

**Sizes**: `sm` (28px) | `md` (36px)
**States**: `default` | `focused` | `error` | `disabled`

```typescript
interface InputProps {
  size?: "sm" | "md";
  placeholder?: string;
  value?: string;
  error?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}
```

| State | Border | Background | Text | Additional |
|-------|--------|------------|------|------------|
| Default | 1px `--cn-border-default` | `--cn-bg-surface` | `--cn-text-primary` | Placeholder: `--cn-text-placeholder` |
| Focused | 2px `--cn-border-focus` | `--cn-bg-surface` | `--cn-text-primary` | Focus ring: 2px offset, `--cn-border-focus` at 25% opacity |
| Error | 1px `--cn-danger` | `--cn-bg-surface` | `--cn-text-primary` | Helper text below: `--cn-danger`, `--cn-text-xs` |
| Disabled | 1px `--cn-border-default` | `--cn-bg-surface` | `--cn-text-disabled` | 30% opacity on entire element |

All inputs use `--cn-radius-md` (8px). Font size: `--cn-text-sm` (14px). Padding: `--cn-space-3` (12px) horizontal.

---

## 10. DO / DON'T Rules

### ✅ DO

1. **Reference `--cn-*` tokens** for all colors, spacing, radius, shadows, and font sizes
2. **Use Framer Motion** for all transitions and animations (use `cnMotion` presets)
3. **Use strict TypeScript** — every component must have a typed `Props` interface
4. **Use `t()` / i18n** for all user-facing strings (no JSX bare strings)
5. **Check existing components** in `primitives/` and `composites/` before creating new ones
6. **Write Storybook Stories** for every new component
7. **Support both themes** — every component must work in Light and Dark mode via tokens
8. **Use semantic token names** — `--cn-text-primary`, not `--cn-prim-dark`
9. **Use the 4px grid** — all spacing aligns to 4px multiples

### ❌ DON'T

1. **DON'T hardcode colors** — no `#FFFFFF`, `#000000`, `rgb(...)` in component styles. Always use `var(--cn-*)`.
2. **DON'T hardcode spacing** — no `padding: 16px`. Use `var(--cn-space-4)`.
3. **DON'T hardcode radius** — no `border-radius: 8px`. Use `var(--cn-radius-md)`.
4. **DON'T hardcode shadows** — no inline `box-shadow`. Use `var(--cn-shadow-float)`.
5. **DON'T hardcode font sizes** — no `font-size: 14px`. Use `var(--cn-text-sm)`.
6. **DON'T use purple, blue, or gold** — anywhere in the UI. These are banned.
7. **DON'T use "AI"** in any user-facing string — the product avoids AI labeling.
8. **DON'T use `any` type** — TypeScript strict mode must compile.
9. **DON'T use Tailwind raw colors** — no `bg-gray-100`. Use semantic token utilities (`cn-bg-surface`).
10. **DON'T use Tailwind built-in shadows** — no `shadow-lg`. Use `--cn-shadow-*` tokens.
11. **DON'T create duplicate primitives** — check `primitives/` before creating button/input/select.

---

## 11. Tailwind Theme Extension

Add to `tailwind.config.ts` to map `--cn-*` tokens into Tailwind utilities:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  // ... other config
  theme: {
    extend: {
      colors: {
        cn: {
          bg: {
            surface: "var(--cn-bg-surface)",
            hover: "var(--cn-bg-hover)",
          },
          text: {
            primary: "var(--cn-text-primary)",
            secondary: "var(--cn-text-secondary)",
            placeholder: "var(--cn-text-placeholder)",
            disabled: "var(--cn-text-disabled)",
          },
          accent: "var(--cn-accent)",
          border: {
            default: "var(--cn-border-default)",
            focus: "var(--cn-border-focus)",
          },
          danger: {
            DEFAULT: "var(--cn-danger)",
            bg: "var(--cn-danger-bg)",
          },
          tooltip: {
            bg: "var(--cn-tooltip-bg)",
            text: "var(--cn-tooltip-text)",
          },
          overlay: "var(--cn-overlay)",
          separator: "var(--cn-separator)",
        },
      },
      spacing: {
        "cn-1": "var(--cn-space-1)",   // 4px
        "cn-2": "var(--cn-space-2)",   // 8px
        "cn-3": "var(--cn-space-3)",   // 12px
        "cn-4": "var(--cn-space-4)",   // 16px
        "cn-6": "var(--cn-space-6)",   // 24px
        "cn-8": "var(--cn-space-8)",   // 32px
      },
      borderRadius: {
        "cn-sm": "var(--cn-radius-sm)",     // 4px
        "cn-md": "var(--cn-radius-md)",     // 8px
        "cn-lg": "var(--cn-radius-lg)",     // 12px
        "cn-full": "var(--cn-radius-full)", // 9999px
      },
      boxShadow: {
        "cn-float": "var(--cn-shadow-float)",
        "cn-overlay": "var(--cn-shadow-overlay)",
      },
      fontSize: {
        "cn-xs": ["var(--cn-text-xs)", { lineHeight: "var(--cn-leading-xs)" }],
        "cn-sm": ["var(--cn-text-sm)", { lineHeight: "var(--cn-leading-sm)" }],
        "cn-base": ["var(--cn-text-base)", { lineHeight: "var(--cn-leading-base)" }],
        "cn-lg": ["var(--cn-text-lg)", { lineHeight: "var(--cn-leading-lg)" }],
      },
      fontFamily: {
        "cn-ui": ["var(--cn-font-ui)"],
        "cn-body": ["var(--cn-font-body)"],
        "cn-mono": ["var(--cn-font-mono)"],
      },
      zIndex: {
        "cn-base": "var(--cn-z-base)",
        "cn-dropdown": "var(--cn-z-dropdown)",
        "cn-overlay": "var(--cn-z-overlay)",
        "cn-modal": "var(--cn-z-modal)",
        "cn-tooltip": "var(--cn-z-tooltip)",
      },
      transitionDuration: {
        "cn-fast": "var(--cn-duration-fast)",
        "cn-normal": "var(--cn-duration-normal)",
        "cn-slow": "var(--cn-duration-slow)",
      },
      transitionTimingFunction: {
        "cn-default": "var(--cn-ease-default)",
        "cn-spring": "var(--cn-ease-spring)",
        "cn-out": "var(--cn-ease-out)",
      },
    },
  },
};

export default config;
```

### Tailwind Usage Examples

```tsx
// Background & text with theme support
<div className="bg-cn-bg-surface text-cn-text-primary">

// Button primary
<button className="bg-cn-accent text-cn-bg-surface rounded-cn-md px-cn-4 h-9 text-cn-sm
  hover:opacity-90 transition-opacity duration-cn-normal ease-cn-default">

// Input
<input className="h-9 bg-cn-bg-surface border border-cn-border-default rounded-cn-md
  px-cn-3 text-cn-sm text-cn-text-primary placeholder:text-cn-text-placeholder
  focus:border-cn-border-focus focus:ring-2 focus:ring-cn-border-focus/25">

// Dropdown menu
<div className="bg-cn-bg-surface rounded-cn-md shadow-cn-float min-w-[200px] p-cn-1
  z-cn-dropdown">

// Tooltip
<div className="bg-cn-tooltip-bg text-cn-tooltip-text text-cn-xs rounded-[6px]
  px-[10px] py-[6px] max-w-[240px] z-cn-tooltip">
```

---

## 12. Quick Reference Card

```
Colors:  bg-surface  bg-hover  text-primary  text-secondary  accent  danger
Spacing: 4  8  12  16  24  32  (--cn-space-{1,2,3,4,6,8})
Radius:  4  8  12  9999  (sm / md / lg / full)
Shadow:  float (menus)  overlay (dialogs)
Type:    12/16  14/20  16/22  20/28  (xs / sm / base / lg)
Timing:  80ms fast  120ms normal  300ms slow
Z:       0 base  100 dropdown  200 overlay  300 modal  400 tooltip
Banned:  purple  blue  gold  "AI"  any-type  hardcoded values
```
