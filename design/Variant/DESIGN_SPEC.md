# CreoNow UI 完整设计规范

> **来源**: `/Variant/` 目录下的 HTML 高保真设计稿
> **基准**: 深色极简主题
> **约束**: 所有 UI 实现必须严格遵循本规范，禁止偏移

---

# 第一部分：项目概述

## 1.1 目标

- 新建一个全新的前端项目 `creonow-ui/`
- 废弃 `creonow-frontend/` 和 `creonow-theia/`
- 完全基于 Variant 设计稿实现

## 1.2 技术栈

| 类别 | 选型 | 版本 |
|------|------|------|
| 框架 | React | 18.x |
| 语言 | TypeScript | 5.x |
| 构建 | Vite | 6.x |
| 样式 | Tailwind CSS + CSS Variables | 4.x |
| 组件原语 | Radix UI | latest |
| 富文本编辑器 | TipTap | 2.x |
| 路由 | React Router | 6.x |
| 状态管理 | Zustand | 4.x |
| Electron | electron-vite | latest |

## 1.3 项目目录结构

```
creonow-ui/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── index.html
│
├── public/
│   ├── fonts/
│   │   ├── Inter-*.woff2
│   │   ├── Lora-*.woff2
│   │   └── JetBrainsMono-*.woff2
│   └── icons/
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── styles/
│   │   ├── tokens.css              # Design Tokens (SSOT)
│   │   ├── fonts.css               # 字体定义
│   │   └── globals.css             # 全局样式
│   │
│   ├── components/
│   │   │
│   │   ├── primitives/             # 原子组件 (无业务逻辑，最小 UI 单元)
│   │   │   ├── Button/             # Primary/Secondary/Ghost/Icon/Danger
│   │   │   ├── Input/              # Text/Password/Search
│   │   │   ├── Textarea/           # 多行输入，自动高度
│   │   │   ├── Select/             # 下拉选择
│   │   │   ├── Card/               # 卡片容器
│   │   │   ├── Badge/              # 标签/徽章
│   │   │   ├── Divider/            # 分割线
│   │   │   ├── Switch/             # 开关
│   │   │   ├── Checkbox/           # 复选框
│   │   │   ├── Avatar/             # 头像
│   │   │   ├── Tooltip/            # 工具提示
│   │   │   ├── Popover/            # 弹出层
│   │   │   ├── Dialog/             # 对话框
│   │   │   ├── Toast/              # 消息提示
│   │   │   └── Spinner/            # 加载指示器
│   │   │
│   │   ├── patterns/               # 通用交互模式 (可跨模块复用)
│   │   │   ├── EmptyState/         # 空状态 (图标 + 文案 + 操作)
│   │   │   ├── LoadingState/       # 加载状态 (骨架屏/Spinner)
│   │   │   ├── ErrorState/         # 错误状态 (图标 + 文案 + 重试)
│   │   │   ├── ConfirmDialog/      # 确认对话框 (危险操作)
│   │   │   └── CodeBlock/          # 代码块 (语法高亮 + 复制)
│   │   │
│   │   └── layout/                 # 布局组件 (页面骨架)
│   │       ├── AppShell/           # 三栏布局容器
│   │       │   └── AppShell.tsx
│   │       ├── IconBar/            # 48px 图标导航条
│   │       │   ├── IconBar.tsx
│   │       │   └── IconBarItem.tsx
│   │       ├── Sidebar/            # 侧边栏 (可折叠)
│   │       │   ├── SidebarContent.tsx
│   │       │   ├── SidebarSection.tsx
│   │       │   └── SidebarItem.tsx
│   │       ├── Panel/              # 右侧面板 (可折叠)
│   │       │   └── Panel.tsx
│   │       ├── Resizer/            # 可拖拽分割线
│   │       │   └── Resizer.tsx
│   │       ├── Toolbar/            # 顶部工具栏
│   │       │   └── Toolbar.tsx
│   │       └── Brand/              # 品牌标识
│   │           └── Brand.tsx
│   │
│   ├── features/                   # 功能模块 (业务组件内聚)
│   │   │
│   │   ├── auth/                   # 认证模块
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── OAuthButtons.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   │
│   │   ├── dashboard/              # 仪表盘模块
│   │   │   ├── components/
│   │   │   │   ├── ProjectCard.tsx       # 项目卡片
│   │   │   │   ├── HeroCard.tsx          # 特色项目大卡片
│   │   │   │   ├── DashboardGrid.tsx     # 项目网格
│   │   │   │   └── DashboardSidebar.tsx  # 仪表盘侧边栏
│   │   │   └── DashboardPage.tsx
│   │   │
│   │   ├── editor/                 # 编辑器模块
│   │   │   ├── components/
│   │   │   │   ├── EditorToolbar.tsx
│   │   │   │   ├── EditorTipTap.tsx
│   │   │   │   └── EditorDetailsPanel.tsx
│   │   │   └── EditorPage.tsx
│   │   │
│   │   ├── ai-panel/               # AI 面板模块
│   │   │   ├── components/
│   │   │   │   ├── AIHeader.tsx
│   │   │   │   ├── AIInput.tsx
│   │   │   │   ├── MessageBubble.tsx     # AI 聊天消息
│   │   │   │   └── AIMessageList.tsx
│   │   │   └── AIPanel.tsx
│   │   │
│   │   ├── settings/               # 设置模块
│   │   │   ├── components/
│   │   │   │   ├── SettingsNav.tsx
│   │   │   │   ├── SettingsSection.tsx
│   │   │   │   ├── WritingSettings.tsx
│   │   │   │   ├── DataSettings.tsx
│   │   │   │   └── AppearanceSettings.tsx
│   │   │   └── SettingsModal.tsx
│   │   │
│   │   ├── file-tree/              # 文件树模块
│   │   │   ├── components/
│   │   │   │   ├── FileTree.tsx
│   │   │   │   └── FileTreeItem.tsx      # 文件树节点
│   │   │   └── FileTreePanel.tsx
│   │   │
│   │   ├── version-history/        # 版本历史模块
│   │   │   ├── components/
│   │   │   │   ├── VersionList.tsx
│   │   │   │   └── VersionItem.tsx       # 版本历史项
│   │   │   └── VersionHistoryPanel.tsx
│   │   │
│   │   ├── command-palette/        # 命令面板模块
│   │   │   └── CommandPalette.tsx
│   │   │
│   │   ├── export/                 # 导出模块
│   │   │   └── ExportDialog.tsx
│   │   │
│   │   ├── skills/                 # 技能面板模块
│   │   │   └── SkillsPanel.tsx
│   │   │
│   │   ├── memory/                 # 记忆面板模块
│   │   │   └── MemoryPanel.tsx
│   │   │
│   │   └── search/                 # 搜索面板模块
│   │       └── SearchPanel.tsx
│   │
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── useRpcConnection.ts     # RPC 连接管理
│   │   └── useLocalStorage.ts      # localStorage 封装
│   │
│   ├── lib/                        # 工具库
│   │   ├── rpc/                    # IPC 调用封装
│   │   │   ├── api.ts              # 类型安全的 invoke
│   │   │   └── connection.ts       # 连接管理器
│   │   └── utils/                  # 通用工具函数
│   │
│   ├── stores/                     # Zustand 状态管理
│   │   ├── layoutStore.ts          # 布局状态 (宽度/折叠)
│   │   ├── authStore.ts            # 认证状态 (本地单用户)
│   │   ├── projectStore.ts         # 项目状态
│   │   ├── editorStore.ts          # 编辑器状态
│   │   ├── aiStore.ts              # AI 面板状态
│   │   ├── settingsStore.ts        # 设置状态
│   │   ├── fileStore.ts            # 文件树状态
│   │   ├── versionStore.ts         # 版本历史状态
│   │   └── commandStore.ts         # 命令面板状态
│   │
│   ├── types/                      # 类型定义
│   │   ├── ipc.ts                  # IPC 类型 (从后端同步)
│   │   └── models.ts               # 业务模型类型
│   │
│   └── pages/                      # 路由页面入口
│       ├── LoginPage.tsx           # /login
│       ├── DashboardPage.tsx       # /dashboard
│       ├── EditorPage.tsx          # /editor/:id
│       ├── RegisterPage.tsx        # /register
│       └── ForgotPasswordPage.tsx  # /forgot-password
│
└── electron/
    ├── main.ts
    └── preload.ts
```

---

# 第二部分：Design Tokens 完整规范

## 2.1 tokens.css

```css
/* ==========================================================================
   CreoNow Design Tokens
   来源: Variant 设计稿
   规则: 所有 UI 组件必须引用这些变量，禁止硬编码
   ========================================================================== */

:root {
  /* --------------------------------------------------------------------------
     颜色系统 - 背景层级
     -------------------------------------------------------------------------- */
  --color-bg-body: #080808;           /* 最深层背景 */
  --color-bg-surface: #0f0f0f;        /* 卡片/面板/输入框背景 */
  --color-bg-hover: #1a1a1a;          /* 悬停状态背景 */
  --color-bg-active: #1f1f1f;         /* 激活/按下状态背景 */

  /* --------------------------------------------------------------------------
     颜色系统 - 文字层级
     -------------------------------------------------------------------------- */
  --color-text-primary: #ffffff;      /* 主要文字 */
  --color-text-secondary: #888888;    /* 次要文字 */
  --color-text-tertiary: #444444;     /* 最弱文字/占位符 */

  /* --------------------------------------------------------------------------
     颜色系统 - 边框
     -------------------------------------------------------------------------- */
  --color-border-default: #222222;    /* 默认边框 */
  --color-border-hover: #333333;      /* 悬停边框 */
  --color-border-focus: #444444;      /* 聚焦边框 */
  --color-border-active: #888888;     /* 激活边框 */

  /* --------------------------------------------------------------------------
     颜色系统 - 功能色
     -------------------------------------------------------------------------- */
  --color-primary: #ffffff;
  --color-primary-hover: #e0e0e0;
  --color-error: #ff4444;
  --color-success: #44ff44;
  --color-warning: #ffaa44;

  /* --------------------------------------------------------------------------
     间距系统
     -------------------------------------------------------------------------- */
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* --------------------------------------------------------------------------
     圆角系统
     -------------------------------------------------------------------------- */
  --radius-none: 0px;
  --radius-sm: 4px;                   /* 输入框 */
  --radius-md: 8px;                   /* 一般按钮/弹窗 */
  --radius-lg: 16px;
  --radius-xl: 24px;                  /* 卡片 */
  --radius-full: 100px;               /* 胶囊按钮 */

  /* --------------------------------------------------------------------------
     字体系统
     -------------------------------------------------------------------------- */
  --font-family-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-body: 'Lora', 'Crimson Pro', Georgia, serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;

  /* --------------------------------------------------------------------------
     字号系统
     -------------------------------------------------------------------------- */
  --font-size-xs: 10px;
  --font-size-sm: 11px;
  --font-size-base: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 24px;
  --font-size-3xl: 32px;
  --font-size-4xl: 48px;

  /* --------------------------------------------------------------------------
     字重系统
     -------------------------------------------------------------------------- */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  /* --------------------------------------------------------------------------
     行高系统
     -------------------------------------------------------------------------- */
  --line-height-tight: 1.1;
  --line-height-snug: 1.3;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.6;
  --line-height-loose: 1.8;

  /* --------------------------------------------------------------------------
     字间距系统
     -------------------------------------------------------------------------- */
  --letter-spacing-tight: -0.02em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.05em;
  --letter-spacing-wider: 0.1em;
  --letter-spacing-widest: 0.12em;

  /* --------------------------------------------------------------------------
     阴影系统
     -------------------------------------------------------------------------- */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.6);

  /* --------------------------------------------------------------------------
     动效系统
     -------------------------------------------------------------------------- */
  --ease-default: cubic-bezier(0.2, 0.0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;

  /* --------------------------------------------------------------------------
     布局系统
     -------------------------------------------------------------------------- */
  --layout-icon-bar-width: 48px;
  --layout-sidebar-width-default: 240px;
  --layout-sidebar-width-min: 180px;
  --layout-sidebar-width-max: 400px;
  --layout-panel-width-default: 280px;
  --layout-panel-width-min: 240px;
  --layout-panel-width-max: 480px;
  --layout-ai-panel-width: 360px;
  --layout-toolbar-height: 60px;
  --layout-toolbar-height-lg: 80px;
  --layout-main-content-min-width: 400px;
  --layout-max-content-width: 760px;
  --layout-resizer-width: 8px;
  --layout-resizer-visible-width: 1px;
  
  /* Mobile 布局 */
  --layout-mobile-header-height: 56px;
  --layout-mobile-tab-bar-height: 56px;
}
```

---

# 第三部分：基础 UI 组件规范

## 3.1 Button

### Props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}
```

### 像素规范

**变体样式:**

| 变体 | 背景 | 背景(hover) | 文字色 | 边框 |
|------|------|-------------|--------|------|
| primary | `#ffffff` | `#e0e0e0` | `#080808` | none |
| secondary | `transparent` | `#1a1a1a` | `#ffffff` | `1px solid #222222` |
| ghost | `transparent` | `#1a1a1a` | `#888888` | none |
| danger | `transparent` | `#ff4444` | `#ff4444` | `1px solid #ff4444` |

**尺寸样式:**

| 尺寸 | height | padding | font-size |
|------|--------|---------|-----------|
| sm | `32px` | `8px 16px` | `12px` |
| md | `40px` | `10px 20px` | `13px` |
| lg | `48px` | `12px 24px` | `14px` |

**通用样式:**
- 圆角: `100px` (pill)
- 字重: `500`
- 过渡: `all 200ms cubic-bezier(0.2, 0.0, 0.2, 1)`
- hover 位移: `translateY(-1px)` (仅 primary)

### 代码

```tsx
const variantStyles = {
  primary: `
    bg-[var(--color-primary)]
    text-[var(--color-bg-body)]
    hover:bg-[var(--color-primary-hover)]
    hover:-translate-y-[1px]
  `,
  secondary: `
    bg-transparent
    text-[var(--color-text-primary)]
    border border-[var(--color-border-default)]
    hover:bg-[var(--color-bg-hover)]
    hover:border-[var(--color-border-focus)]
  `,
  ghost: `
    bg-transparent
    text-[var(--color-text-secondary)]
    hover:text-[var(--color-text-primary)]
    hover:bg-[var(--color-bg-hover)]
  `,
};

const sizeStyles = {
  sm: 'h-8 px-4 text-[12px]',
  md: 'h-10 px-5 text-[13px]',
  lg: 'h-12 px-6 text-[14px]',
};
```

---

## 3.2 Input

### Props

```typescript
interface InputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}
```

### 像素规范

| 状态 | 背景 | 边框 | 文字色 |
|------|------|------|--------|
| 默认 | `#0f0f0f` | `#222222` | `#ffffff` |
| 悬停 | `#0f0f0f` | `#333333` | `#ffffff` |
| 聚焦 | `#1a1a1a` | `#888888` | `#ffffff` |
| 错误 | `#0f0f0f` | `#ff4444` | `#ffffff` |
| 禁用 | `#0f0f0f` | `#222222` | `#444444` |

**通用样式:**
- 高度: `48px`
- 内边距: `14px 16px`
- 字号: `14px`
- 圆角: `4px`
- 占位符色: `#444444`
- 过渡: `all 300ms cubic-bezier(0.2, 0.0, 0.2, 1)`

**标签样式:**
- 字号: `11px`
- 字重: `500`
- 大写: `uppercase`
- 字母间距: `0.12em`
- 颜色: `#888888`

### 代码

```tsx
<input
  className="
    w-full h-12
    px-4 py-3.5
    bg-[var(--color-bg-surface)]
    border border-[var(--color-border-default)]
    rounded-[4px]
    text-[14px]
    text-[var(--color-text-primary)]
    placeholder:text-[var(--color-text-tertiary)]
    outline-none
    transition-all duration-[300ms]
    hover:border-[var(--color-border-hover)]
    focus:border-[var(--color-text-secondary)]
    focus:bg-[var(--color-bg-hover)]
  "
/>
```

---

## 3.3 Card

### Props

```typescript
interface CardProps {
  variant?: 'default' | 'outlined' | 'elevated';
  clickable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}
```

### 像素规范

| 属性 | 值 |
|------|-----|
| 背景 | `#0f0f0f` 或 `transparent` |
| 边框 | `1px solid #222222` |
| 边框(hover) | `1px solid #444444` |
| 圆角 | `24px` |
| 最小高度 | `240px` |

**内边距:**
| 尺寸 | 值 |
|------|-----|
| none | `0` |
| sm | `16px` |
| md | `24px` |
| lg | `32px` |

### 代码

```tsx
<div
  className="
    rounded-[24px]
    border border-[var(--color-border-default)]
    transition-all duration-[300ms]
    bg-[var(--color-bg-surface)]
    hover:border-[var(--color-border-focus)]
    hover:bg-[var(--color-bg-hover)]
    cursor-pointer
  "
/>
```

---

## 3.4 Badge / Tag

### Props

```typescript
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}
```

### 变体颜色

| 变体 | 边框色 | 文字色 |
|------|--------|--------|
| default | `#222222` | `#888888` |
| success | `#44ff44` | `#44ff44` |
| warning | `#ffaa44` | `#ffaa44` |
| error | `#ff4444` | `#ff4444` |

### 像素规范

| 属性 | 值 |
|------|-----|
| 背景 | `transparent` |
| 边框 | `1px solid` (颜色见上表) |
| 边框(hover) | 亮度 +20% |
| 圆角 | `100px` |
| 内边距 | `4px 10px` |
| 字号 | `11px` |
| 字母间距 | `0.05em` |
| 大小写 | `uppercase` |

---

## 3.5 Switch

### Props

```typescript
interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}
```

### 像素规范

| 状态 | 轨道背景 | 轨道边框 | 滑块颜色 |
|------|----------|----------|----------|
| 未选中 | `#1a1a1a` | `#333333` | `#666666` |
| 选中 | `#ffffff` | `#ffffff` | `#080808` |

| 属性 | 值 |
|------|-----|
| 轨道宽度 | `44px` |
| 轨道高度 | `24px` |
| 轨道圆角 | `12px` |
| 滑块尺寸 | `18px` |
| 滑块位移 | `20px` |
| 动效时长 | `300ms` |

---

## 3.6 Checkbox

### Props

```typescript
interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}
```

### 像素规范

| 状态 | 背景 | 边框 | 勾选色 |
|------|------|------|--------|
| 未选中 | `#0f0f0f` | `#222222` | - |
| 悬停 | `#0f0f0f` | `#444444` | - |
| 选中 | `#ffffff` | `#ffffff` | `#080808` |

| 属性 | 值 |
|------|-----|
| 尺寸 | `16px × 16px` |
| 圆角 | `3px` |
| 勾选图标 | `border: 0 1.5px 1.5px 0` |

---

## 3.7 Divider

### Props

```typescript
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}
```

### 像素规范

| 属性 | 水平 | 垂直 |
|------|------|------|
| 背景 | `#222222` | `#222222` |
| 厚度 | `1px` | `1px` |
| 宽度 | `100%` | `1px` |
| 高度 | `1px` | `100%` |

---

## 3.8 Textarea

### Props

```typescript
interface TextareaProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  rows?: number;
  autoHeight?: boolean;      // 自动调整高度
  maxLength?: number;
  showCount?: boolean;       // 显示字数统计
  onChange?: (value: string) => void;
}
```

### 像素规范

| 状态 | 背景 | 边框 | 文字色 |
|------|------|------|--------|
| 默认 | `#0f0f0f` | `#222222` | `#ffffff` |
| 悬停 | `#0f0f0f` | `#333333` | `#ffffff` |
| 聚焦 | `#0f0f0f` | `#888888` | `#ffffff` |
| 错误 | `#0f0f0f` | `#ff4444` | `#ffffff` |
| 禁用 | `#080808` | `#1a1a1a` | `#444444` |

| 属性 | 值 |
|------|-----|
| 最小高度 | `80px` |
| 内边距 | `12px` |
| 圆角 | `4px` |
| 字号 | `14px` |
| 行高 | `1.6` |
| 字数统计字号 | `11px` |
| 字数统计颜色 | `#666666` |
| 字数统计位置 | 右下角，`padding: 8px` |

---

## 3.9 Avatar

### Props

```typescript
interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;         // 图片加载失败时显示的文字
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

### 像素规范

| 尺寸 | 宽高 | 字号 (fallback) |
|------|------|-----------------|
| sm | `24px` | `10px` |
| md | `32px` | `12px` |
| lg | `40px` | `14px` |
| xl | `64px` | `20px` |

| 属性 | 值 |
|------|-----|
| 形状 | 圆形 (`border-radius: 50%`) |
| 背景 (fallback) | `#222222` |
| 文字色 (fallback) | `#888888` |
| 边框 | `1px solid #333333` |

---

## 3.10 Tooltip

### Props

```typescript
interface TooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;    // 默认 300ms
  children: React.ReactNode;
}
```

### 像素规范

| 属性 | 值 |
|------|-----|
| 背景 | `#1a1a1a` |
| 边框 | `1px solid #333333` |
| 圆角 | `6px` |
| 内边距 | `6px 10px` |
| 字号 | `12px` |
| 字重 | `400` |
| 文字色 | `#ffffff` |
| 最大宽度 | `200px` |
| 阴影 | `0 4px 8px rgba(0, 0, 0, 0.4)` |
| 箭头大小 | `6px` |
| 延迟显示 | `300ms` |
| 出现动画 | `fade + scale`, `150ms` |

---

## 3.11 Popover

### Props

```typescript
interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
```

### 像素规范

| 属性 | 值 |
|------|-----|
| 背景 | `#0f0f0f` |
| 边框 | `1px solid #222222` |
| 圆角 | `8px` |
| 内边距 | `12px` |
| 最小宽度 | `200px` |
| 最大宽度 | `320px` |
| 阴影 | `0 8px 16px rgba(0, 0, 0, 0.5)` |
| 出现动画 | `fade + translateY(4px)`, `200ms` |

---

## 3.12 Dialog

### Props

```typescript
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

### 像素规范

| 元素 | 属性 | 值 |
|------|------|-----|
| 遮罩 | 背景 | `rgba(0, 0, 0, 0.8)` |
| | 动画 | `fade`, `200ms` |
| 容器 | 背景 | `#0f0f0f` |
| | 边框 | `1px solid #222222` |
| | 圆角 | `16px` |
| | 最小宽度 | `400px` |
| | 最大宽度 | `560px` |
| | 内边距 | `24px` |
| | 阴影 | `0 16px 32px rgba(0, 0, 0, 0.6)` |
| 标题 | 字号 | `18px` |
| | 字重 | `600` |
| | 颜色 | `#ffffff` |
| | 下边距 | `8px` |
| 描述 | 字号 | `14px` |
| | 颜色 | `#888888` |
| | 下边距 | `24px` |
| Footer | 上边距 | `24px` |
| | 对齐 | `flex-end` |
| | 按钮间距 | `12px` |
| 关闭按钮 | 位置 | 右上角 `16px` |
| | 尺寸 | `32px x 32px` |
| | 图标大小 | `16px` |
| | 颜色 | `#666666` -> `#ffffff` (hover) |

---

## 3.13 Toast

### Props

```typescript
interface ToastProps {
  variant?: 'default' | 'success' | 'error' | 'warning';
  title?: string;
  description?: string;
  action?: React.ReactNode;
  duration?: number;         // 默认 3000ms，0 表示不自动关闭
}
```

### 像素规范

| 变体 | 左边框色 | 图标色 |
|------|----------|--------|
| default | `#888888` | `#888888` |
| success | `#44ff44` | `#44ff44` |
| error | `#ff4444` | `#ff4444` |
| warning | `#ffaa44` | `#ffaa44` |

| 属性 | 值 |
|------|-----|
| 背景 | `#1a1a1a` |
| 边框 | `1px solid #333333` |
| 左边框宽度 | `3px` |
| 圆角 | `8px` |
| 内边距 | `12px 16px` |
| 最小宽度 | `300px` |
| 最大宽度 | `400px` |
| 阴影 | `0 4px 8px rgba(0, 0, 0, 0.4)` |
| 位置 | 右下角，`bottom: 24px`, `right: 24px` |
| 间距 (多个) | `12px` |
| 标题字号 | `14px` |
| 标题字重 | `500` |
| 描述字号 | `13px` |
| 描述颜色 | `#888888` |
| 出现动画 | `slideInRight`, `300ms` |
| 消失动画 | `fadeOut`, `200ms` |

---

## 3.14 Spinner

### Props

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;            // 默认使用 currentColor
}
```

### 像素规范

| 尺寸 | 宽高 | 边框宽度 |
|------|------|----------|
| sm | `16px` | `2px` |
| md | `24px` | `2px` |
| lg | `32px` | `3px` |

| 属性 | 值 |
|------|-----|
| 形状 | 圆形 |
| 背景色 | `transparent` |
| 轨道色 | `#222222` |
| 前景色 | `currentColor` (默认 `#ffffff`) |
| 动画 | `spin`, `1s`, `linear`, `infinite` |

---

## 3.15 Select

### Props

```typescript
interface SelectProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  options: SelectOption[];
  onChange?: (value: string) => void;
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

### 像素规范

**触发器:**

| 状态 | 背景 | 边框 |
|------|------|------|
| 默认 | `#0f0f0f` | `#222222` |
| 悬停 | `#0f0f0f` | `#333333` |
| 打开 | `#0f0f0f` | `#888888` |
| 禁用 | `#080808` | `#1a1a1a` |

| 属性 | 值 |
|------|-----|
| 高度 | `40px` |
| 内边距 | `10px 12px` |
| 圆角 | `4px` |
| 字号 | `13px` |
| 箭头图标 | `12px`, `#666666` |

**下拉菜单:**

| 属性 | 值 |
|------|-----|
| 背景 | `#0f0f0f` |
| 边框 | `1px solid #222222` |
| 圆角 | `8px` |
| 阴影 | `0 8px 16px rgba(0, 0, 0, 0.5)` |
| 最大高度 | `240px` |
| 内边距 | `4px` |

**选项:**

| 状态 | 背景 | 文字色 |
|------|------|--------|
| 默认 | `transparent` | `#ffffff` |
| 悬停 | `#1a1a1a` | `#ffffff` |
| 选中 | `#222222` | `#ffffff` |
| 禁用 | `transparent` | `#444444` |

| 属性 | 值 |
|------|-----|
| 高度 | `36px` |
| 内边距 | `8px 12px` |
| 圆角 | `4px` |
| 字号 | `13px` |

---

## 3.16 图标系统

### 图标库选型

| 库 | 用途 | 版本 |
|-----|------|------|
| **Lucide React** | 主要图标库 | latest |

> **选择原因**: Lucide 是 Feather Icons 的社区分支，提供 1000+ 图标，样式一致，体积小，与深色主题契合。

### 常用图标清单

| 用途 | 图标名称 | 组件名 |
|------|----------|--------|
| 项目/文件夹 | folder | `Folder` |
| 文件 | file-text | `FileText` |
| 搜索 | search | `Search` |
| AI 助手 | bot | `Bot` |
| 设置 | settings | `Settings` |
| 历史/时钟 | clock | `Clock` |
| 关闭 | x | `X` |
| 检查/确认 | check | `Check` |
| 复制 | copy | `Copy` |
| 加粗 | bold | `Bold` |
| 斜体 | italic | `Italic` |
| 下划线 | underline | `Underline` |
| 列表 | list | `List` |
| 链接 | link | `Link` |
| 图片 | image | `Image` |
| 代码 | code | `Code` |
| 引用 | quote | `Quote` |
| 撤销 | undo | `Undo` |
| 重做 | redo | `Redo` |
| 保存 | save | `Save` |
| 导出 | download | `Download` |
| 分享 | share-2 | `Share2` |
| 更多 | more-horizontal | `MoreHorizontal` |
| 添加 | plus | `Plus` |
| 删除 | trash-2 | `Trash2` |
| 编辑 | pencil | `Pencil` |
| 展开 | chevron-down | `ChevronDown` |
| 折叠 | chevron-up | `ChevronUp` |
| 左箭头 | chevron-left | `ChevronLeft` |
| 右箭头 | chevron-right | `ChevronRight` |
| 侧边栏 | panel-left | `PanelLeft` |
| 错误/警告 | alert-circle | `AlertCircle` |
| 成功 | check-circle | `CheckCircle` |
| 信息 | info | `Info` |
| 用户 | user | `User` |
| 登出 | log-out | `LogOut` |

### 图标尺寸规范

| 场景 | 尺寸 | stroke-width |
|------|------|--------------|
| 小图标 (按钮内、徽章) | `14px` | `1.5` |
| 默认图标 | `16px` | `1.5` |
| 中等图标 (导航、工具栏) | `20px` | `1.5` |
| 大图标 (空状态、错误状态) | `48px` | `1` |

### 图标颜色规范

| 状态 | 颜色 |
|------|------|
| 默认 | `currentColor` (继承父元素) |
| 次要 | `#666666` |
| 禁用 | `#444444` |
| 错误 | `#ff4444` |
| 成功 | `#44ff44` |
| 警告 | `#ffaa44` |

### 使用示例

```tsx
import { Bot, Settings, Search } from 'lucide-react';

// 默认使用
<Bot className="w-5 h-5" />

// 指定颜色
<Settings className="w-5 h-5 text-[var(--color-text-tertiary)]" />

// 带状态变化
<Search className="w-4 h-4 text-[#666666] group-hover:text-white transition-colors" />
```

---

## 3.17 表单验证规范

### 验证时机

| 时机 | 触发条件 | 行为 |
|------|----------|------|
| **blur 验证** | 输入框失去焦点 | 验证当前字段，显示错误 |
| **change 验证** | 字段已有错误时的输入变化 | 实时清除错误（如果修正了） |
| **submit 验证** | 提交表单 | 验证所有字段，阻止提交，聚焦第一个错误 |

### 错误提示位置

| 组件 | 错误提示位置 |
|------|--------------|
| Input | 输入框下方，`margin-top: 4px` |
| Textarea | 输入框下方，`margin-top: 4px` |
| Select | 下拉框下方，`margin-top: 4px` |
| Checkbox | 标签右侧或下方 |
| 表单级错误 | 表单顶部或提交按钮上方 |

### 错误提示样式

| 属性 | 值 |
|------|-----|
| 字号 | `12px` |
| 颜色 | `#ff4444` |
| 行高 | `1.4` |
| 图标 | `AlertCircle`, `12px`, 与文字同色 |
| 图标间距 | `4px` |

### 输入框错误状态

| 属性 | 值 |
|------|-----|
| 边框色 | `#ff4444` |
| 边框色 (focus) | `#ff4444` |
| 背景色 | 保持不变 (`#0f0f0f`) |
| shake 动画 | `0.5s`, submit 失败时触发 |

### 常见验证规则

| 规则 | 错误消息示例 |
|------|--------------|
| 必填 | "This field is required" |
| 邮箱格式 | "Please enter a valid email address" |
| 最小长度 | "Must be at least {n} characters" |
| 最大长度 | "Must be no more than {n} characters" |
| 密码强度 | "Password must contain at least one uppercase letter, one number" |
| 确认密码 | "Passwords do not match" |

### 代码示例

```tsx
interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-[13px] text-[var(--color-text-secondary)] mb-1.5">
          {label}
          {required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && (
        <div className="flex items-center gap-1 mt-1 text-[12px] text-[var(--color-error)]">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}
```

### Shake 动画 CSS

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}
```

---

# 第四部分：布局组件规范

## 4.1 AppShell (三栏布局 - 可拖拽/可折叠)

### 布局结构

```
+------+----------+---------------------------+----------+
|      |          |                           |          |
| Icon | Sidebar  |      Main Content         |  Panel   |
| Bar  | (展开时)  |       (flex-1)            | (可折叠)  |
| 48px | 240px    |                           | 280-360px|
|      |          |                           |          |
+------+----||----+---------------------------+----||----+
           ↑ 可拖拽分割线                           ↑ 可拖拽分割线
```

### 交互规范

| 功能 | 描述 |
|------|------|
| **拖拽调节** | 两条分割线均可拖拽，实时调整宽度 |
| **最小/最大宽度** | Sidebar: `180px - 400px`，Panel: `240px - 480px` |
| **折叠/展开** | Sidebar 和 Panel 均可折叠，折叠时宽度为 `0` |
| **Icon Bar** | 始终可见的图标条，宽度 `48px`，用于快速切换和展开 Sidebar |

### 像素规范

| 元素 | 属性 | 值 |
|------|------|-----|
| Icon Bar | 宽度 | `48px` |
| | 背景 | `#080808` |
| | 右边框 | `1px solid #222222` |
| Sidebar (展开) | 默认宽度 | `240px` |
| | 最小宽度 | `180px` |
| | 最大宽度 | `400px` |
| Main Content | 最小宽度 | `400px` |
| Context Panel | 默认宽度 | `280px` (普通) / `360px` (AI) |
| | 最小宽度 | `240px` |
| | 最大宽度 | `480px` |
| 分割线 | 宽度 | `4px` (可点击区域) |
| | 可见宽度 | `1px` |
| | 颜色 | `#222222` |
| | hover 颜色 | `#444444` |
| | 拖拽时颜色 | `#888888` |
| | cursor | `col-resize` |

### 折叠状态

| 状态 | Sidebar | Panel |
|------|---------|-------|
| 展开 | Icon Bar (48px) + Sidebar Content (240px+) | 280px+ |
| 折叠 | 仅 Icon Bar (48px) | 0px (完全隐藏) |

### 代码框架

```tsx
// AppShell.tsx
import { useState, useRef, useCallback } from 'react';

interface AppShellProps {
  iconBar: React.ReactNode;
  sidebar: React.ReactNode;
  panel?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ iconBar, sidebar, panel, children }: AppShellProps) {
  // 宽度状态
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [panelWidth, setPanelWidth] = useState(280);
  
  // 折叠状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // 拖拽处理
  const handleSidebarDrag = useCallback((e: MouseEvent) => {
    const newWidth = e.clientX - 48; // 减去 Icon Bar 宽度
    setSidebarWidth(Math.max(180, Math.min(400, newWidth)));
  }, []);

  const handlePanelDrag = useCallback((e: MouseEvent) => {
    const newWidth = window.innerWidth - e.clientX;
    setPanelWidth(Math.max(240, Math.min(480, newWidth)));
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-[var(--color-bg-body)]">
      {/* Icon Bar - 始终可见 */}
      <div className="w-12 h-full border-r border-[var(--color-border-default)] flex flex-col shrink-0">
        {iconBar}
      </div>

      {/* Sidebar Content - 可折叠 */}
      {!sidebarCollapsed && (
        <>
          <div
            className="h-full border-r border-[var(--color-border-default)] overflow-hidden"
            style={{ width: sidebarWidth }}
          >
            {sidebar}
          </div>

          {/* Sidebar Resizer */}
          <div
            className="
              w-1 h-full cursor-col-resize
              bg-[var(--color-border-default)]
              hover:bg-[var(--color-border-focus)]
              active:bg-[var(--color-border-active)]
              transition-colors
            "
            onMouseDown={startSidebarDrag}
          />
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-[400px] overflow-hidden">
        {children}
      </main>

      {/* Panel Resizer */}
      {!panelCollapsed && panel && (
        <div
          className="
            w-1 h-full cursor-col-resize
            bg-[var(--color-border-default)]
            hover:bg-[var(--color-border-focus)]
            active:bg-[var(--color-border-active)]
            transition-colors
          "
          onMouseDown={startPanelDrag}
        />
      )}

      {/* Context Panel - 可折叠 */}
      {!panelCollapsed && panel && (
        <aside
          className="h-full border-l border-[var(--color-border-default)] overflow-hidden"
          style={{ width: panelWidth }}
        >
          {panel}
        </aside>
      )}
    </div>
  );
}
```

---

## 4.2 Icon Bar (图标导航条)

### 像素规范

| 元素 | 属性 | 值 |
|------|------|-----|
| 容器 | 宽度 | `48px` |
| | 背景 | `#080808` |
| | 内边距 | `8px 0` |
| 图标按钮 | 尺寸 | `40px × 40px` |
| | 圆角 | `8px` |
| | 图标大小 | `20px` |
| | 颜色(默认) | `#666666` |
| | 颜色(hover) | `#ffffff` |
| | 颜色(active) | `#ffffff` |
| | 背景(hover) | `#1a1a1a` |
| | 背景(active) | `#222222` |
| 活动指示器 | 位置 | 左侧 `2px` |
| | 宽度 | `2px` |
| | 高度 | `20px` |
| | 颜色 | `#ffffff` |
| | 圆角 | `1px` |
| Tooltip | 位置 | 右侧 `8px` |
| | 背景 | `#1a1a1a` |
| | 边框 | `1px solid #333333` |
| | 圆角 | `6px` |
| | 内边距 | `6px 10px` |
| | 字号 | `12px` |
| | 颜色 | `#ffffff` |
| | 延迟显示 | `300ms` |

### Props

```typescript
interface IconBarProps {
  items: IconBarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onToggleSidebar: () => void;
  bottomItems?: IconBarItem[];
}

interface IconBarItem {
  id: string;
  icon: React.ReactNode;
  label: string;           // Tooltip 显示的文字
  badge?: number | string; // 可选的徽章
}
```

### 代码

```tsx
// IconBar.tsx
import { useState } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';

export function IconBar({
  items,
  activeId,
  onSelect,
  onToggleSidebar,
  bottomItems,
}: IconBarProps) {
  return (
    <div className="w-12 h-full bg-[var(--color-bg-body)] flex flex-col py-2">
      {/* Toggle Button */}
      <Tooltip content="Toggle Sidebar" side="right">
        <button
          onClick={onToggleSidebar}
          className="
            w-10 h-10 mx-auto mb-2
            flex items-center justify-center
            rounded-lg
            text-[var(--color-text-tertiary)]
            hover:text-[var(--color-text-primary)]
            hover:bg-[var(--color-bg-hover)]
            transition-colors
          "
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </Tooltip>

      {/* Divider */}
      <div className="h-px bg-[var(--color-border-default)] mx-2 my-2" />

      {/* Main Items */}
      <div className="flex-1 flex flex-col gap-1">
        {items.map((item) => (
          <Tooltip key={item.id} content={item.label} side="right" delayDuration={300}>
            <button
              onClick={() => onSelect(item.id)}
              className={`
                relative
                w-10 h-10 mx-auto
                flex items-center justify-center
                rounded-lg
                transition-colors
                ${activeId === item.id
                  ? 'text-[var(--color-text-primary)] bg-[var(--color-bg-hover)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
                }
              `}
            >
              {/* Active Indicator */}
              {activeId === item.id && (
                <div
                  className="
                    absolute left-0 top-1/2 -translate-y-1/2
                    w-0.5 h-5
                    bg-[var(--color-text-primary)]
                    rounded-r
                  "
                />
              )}

              {item.icon}

              {/* Badge */}
              {item.badge && (
                <span
                  className="
                    absolute -top-1 -right-1
                    min-w-[16px] h-4
                    bg-[var(--color-primary)]
                    text-[var(--color-bg-body)]
                    text-[10px] font-medium
                    rounded-full
                    flex items-center justify-center
                    px-1
                  "
                >
                  {item.badge}
                </span>
              )}
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Bottom Items */}
      {bottomItems && (
        <div className="flex flex-col gap-1 mt-auto">
          {bottomItems.map((item) => (
            <Tooltip key={item.id} content={item.label} side="right" delayDuration={300}>
              <button
                onClick={() => onSelect(item.id)}
                className="
                  w-10 h-10 mx-auto
                  flex items-center justify-center
                  rounded-lg
                  text-[var(--color-text-tertiary)]
                  hover:text-[var(--color-text-primary)]
                  hover:bg-[var(--color-bg-hover)]
                  transition-colors
                "
              >
                {item.icon}
              </button>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 默认图标项

| ID | 图标 | Label | 功能 |
|-----|------|-------|------|
| `projects` | 文件夹 | Projects | 项目列表 |
| `search` | 搜索 | Search | 全局搜索 |
| `ai` | 机器人 | AI Assistant | AI 面板 |
| `history` | 时钟 | Version History | 版本历史 |
| `settings` | 齿轮 | Settings | 设置 (底部) |

---

## 4.3 Sidebar Content (侧边栏内容区)

> **注意**: 这是 Icon Bar 展开后显示的内容区，可以通过拖拽分割线调整宽度，也可以折叠隐藏。

### 像素规范

| 元素 | 属性 | 值 |
|------|------|-----|
| 容器 | 默认宽度 | `240px` |
| | 最小宽度 | `180px` |
| | 最大宽度 | `400px` |
| | 背景 | `#080808` |
| | 内边距 | `16px` |
| 头部标题 | 字号 | `12px` |
| | 字重 | `600` |
| | 颜色 | `#ffffff` |
| | 下边距 | `16px` |
| Section 标题 | 字号 | `10px` |
| | 大小写 | `uppercase` |
| | 字母间距 | `0.1em` |
| | 颜色 | `#666666` |
| | 下边距 | `8px` |
| 列表项 | 字号 | `13px` |
| | 颜色(默认) | `#888888` |
| | 颜色(hover) | `#ffffff` |
| | 颜色(active) | `#ffffff` |
| | 内边距 | `6px 8px` |
| | 圆角 | `4px` |
| | 背景(hover) | `#1a1a1a` |
| | 背景(active) | `#222222` |

### 代码

```tsx
// SidebarContent.tsx
interface SidebarContentProps {
  title: string;
  onCollapse: () => void;
  children: React.ReactNode;
}

export function SidebarContent({ title, onCollapse, children }: SidebarContentProps) {
  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-[12px] font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
        <button
          onClick={onCollapse}
          className="
            w-6 h-6
            flex items-center justify-center
            rounded
            text-[var(--color-text-tertiary)]
            hover:text-[var(--color-text-primary)]
            hover:bg-[var(--color-bg-hover)]
            transition-colors
          "
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// SidebarSection.tsx
interface SidebarSectionProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function SidebarSection({ title, action, children }: SidebarSectionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">
          {title}
        </span>
        {action}
      </div>
      <div className="flex flex-col gap-0.5">
        {children}
      </div>
    </div>
  );
}

// SidebarItem.tsx
interface SidebarItemProps {
  active?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}

export function SidebarItem({ active, icon, badge, onClick, children }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full
        flex items-center gap-2
        px-2 py-1.5
        rounded
        text-[13px] text-left
        transition-colors
        ${active
          ? 'text-[var(--color-text-primary)] bg-[var(--color-bg-hover)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
        }
      `}
    >
      {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {badge && <span className="text-[11px] text-[var(--color-text-tertiary)]">{badge}</span>}
    </button>
  );
}
```

---

## 4.4 Toolbar

### Props

```typescript
interface ToolbarProps {
  size?: 'default' | 'large';
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}
```

### 像素规范

| 尺寸 | 高度 | 内边距 |
|------|------|--------|
| default | `60px` | `0 24px` |
| large | `80px` | `0 48px` |

**通用样式:**
- 下边框: `1px solid #222222`
- 布局: `flex justify-between items-center`

---

## 4.5 Panel (右侧面板 - 可拖拽/可折叠)

### Props

```typescript
interface PanelProps {
  variant?: 'default' | 'ai';
  collapsed?: boolean;
  width?: number;
  onWidthChange?: (width: number) => void;
  onCollapse?: () => void;
  children: React.ReactNode;
}
```

### 像素规范

| 属性 | 值 |
|------|-----|
| 默认宽度 | `280px` (普通) / `360px` (AI) |
| 最小宽度 | `240px` |
| 最大宽度 | `480px` |
| 背景 | `#080808` (普通) / `#0f0f0f` (AI) |
| 左边框 | `1px solid #222222` |
| 内边距 | `16px` |

### 折叠行为

| 状态 | 描述 |
|------|------|
| 展开 | 显示完整面板内容 |
| 折叠 | 完全隐藏 (宽度为 0) |
| 切换方式 | 点击 Icon Bar 中的对应图标 |

### 折叠按钮

| 属性 | 值 |
|------|-----|
| 位置 | 面板头部右侧 |
| 图标 | `chevron-right` (展开时) |
| 尺寸 | `24px × 24px` |
| 颜色 | `#444444` → `#ffffff` (hover) |

---

## 4.6 Resizer (拖拽分割线)

### 像素规范

| 属性 | 值 |
|------|-----|
| 可点击宽度 | `8px` |
| 可见线宽度 | `1px` |
| 颜色(默认) | `#222222` |
| 颜色(hover) | `#444444` |
| 颜色(拖拽中) | `#888888` |
| cursor | `col-resize` |

### 代码

```tsx
// Resizer.tsx
import { useCallback, useRef, useState } from 'react';

interface ResizerProps {
  onResize: (delta: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export function Resizer({ onResize, onResizeStart, onResizeEnd }: ResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    onResizeStart?.();

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onResize, onResizeStart, onResizeEnd]);

  return (
    <div
      className={`
        w-2 h-full
        flex items-center justify-center
        cursor-col-resize
        group
      `}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`
          w-px h-full
          transition-colors duration-150
          ${isDragging
            ? 'bg-[var(--color-border-active)]'
            : 'bg-[var(--color-border-default)] group-hover:bg-[var(--color-border-focus)]'
          }
        `}
      />
    </div>
  );
}
```

---

# 第五部分：交互模式组件规范 (patterns/)

> **说明**: patterns 是可跨模块复用的通用交互模式，处理加载、空状态、错误等常见 UX 场景。

---

## 5.1 EmptyState

### Props

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
}
```

### 像素规范

| 元素 | 属性 | 值 |
|------|------|-----|
| 容器 | 对齐 | 水平垂直居中 |
| | 内边距 | `48px` |
| | 最大宽度 | `320px` |
| 图标 | 尺寸 | `48px` |
| | 颜色 | `#444444` |
| | 下边距 | `16px` |
| 标题 | 字号 | `16px` |
| | 字重 | `500` |
| | 颜色 | `#888888` |
| | 下边距 | `8px` |
| 描述 | 字号 | `13px` |
| | 颜色 | `#666666` |
| | 行高 | `1.5` |
| | 下边距 | `24px` |
| 操作按钮 | 使用 | Button 组件 |

### 代码

```tsx
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 max-w-[320px] mx-auto text-center">
      {icon && (
        <div className="w-12 h-12 mb-4 text-[var(--color-text-tertiary)]">
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-medium text-[var(--color-text-secondary)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[13px] text-[#666666] leading-relaxed mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button variant={action.variant || 'secondary'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

---

## 5.2 LoadingState

### Props

```typescript
interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';
  text?: string;              // 仅 spinner 模式
  fullscreen?: boolean;
}

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  animate?: boolean;
}
```

### 像素规范

**Spinner 模式:**

| 属性 | 值 |
|------|-----|
| Spinner 尺寸 | `lg` (32px) |
| 文字字号 | `13px` |
| 文字颜色 | `#888888` |
| 间距 | `12px` |

**Skeleton 骨架屏:**

| 属性 | 值 |
|------|-----|
| 背景色 | `#1a1a1a` |
| 动画高亮色 | `#222222` |
| 动画方向 | 从左到右 |
| 动画时长 | `1.5s` |
| 动画类型 | `shimmer`, `infinite` |

### 代码

```tsx
// Skeleton 组件
export function Skeleton({ 
  width = '100%', 
  height = '16px', 
  rounded = 'sm',
  animate = true 
}: SkeletonProps) {
  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={`
        bg-[#1a1a1a] ${roundedClass}
        ${animate ? 'animate-shimmer' : ''}
      `}
      style={{ width, height }}
    />
  );
}

// LoadingState 组件
export function LoadingState({ variant = 'spinner', text, fullscreen }: LoadingStateProps) {
  const content = variant === 'spinner' ? (
    <div className="flex flex-col items-center gap-3">
      <Spinner size="lg" />
      {text && <span className="text-[13px] text-[var(--color-text-secondary)]">{text}</span>}
    </div>
  ) : (
    <div className="space-y-3">
      <Skeleton height="24px" width="60%" />
      <Skeleton height="16px" />
      <Skeleton height="16px" />
      <Skeleton height="16px" width="80%" />
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--color-bg-body)]">
        {content}
      </div>
    );
  }

  return content;
}
```

### Shimmer 动画 CSS

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    #1a1a1a 0%,
    #222222 50%,
    #1a1a1a 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 5.3 ErrorState

### Props

```typescript
interface ErrorStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  error?: Error | string;     // 显示错误详情
  onRetry?: () => void;
  retryText?: string;
}
```

### 像素规范

| 元素 | 属性 | 值 |
|------|------|-----|
| 容器 | 同 EmptyState | - |
| 图标 | 尺寸 | `48px` |
| | 颜色 | `#ff4444` |
| 标题 | 字号 | `16px` |
| | 颜色 | `#ffffff` |
| 描述 | 字号 | `13px` |
| | 颜色 | `#888888` |
| 错误详情 | 背景 | `#1a1a1a` |
| | 边框 | `1px solid #333333` |
| | 圆角 | `4px` |
| | 内边距 | `12px` |
| | 字号 | `12px` |
| | 字体 | `monospace` |
| | 颜色 | `#ff6666` |
| | 最大高度 | `120px` |

### 代码

```tsx
export function ErrorState({ 
  icon, 
  title = 'Something went wrong', 
  description,
  error,
  onRetry,
  retryText = 'Try again'
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 max-w-[400px] mx-auto text-center">
      <div className="w-12 h-12 mb-4 text-[var(--color-error)]">
        {icon || <AlertCircleIcon />}
      </div>
      <h3 className="text-[16px] font-medium text-[var(--color-text-primary)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
          {description}
        </p>
      )}
      {error && (
        <pre className="
          w-full p-3 mb-4
          bg-[#1a1a1a] border border-[#333333] rounded
          text-[12px] font-mono text-[#ff6666]
          max-h-[120px] overflow-auto text-left
        ">
          {typeof error === 'string' ? error : error.message}
        </pre>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryText}
        </Button>
      )}
    </div>
  );
}
```

---

## 5.4 ConfirmDialog

### Props

```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}
```

### 像素规范

| 变体 | 确认按钮样式 |
|------|--------------|
| default | `primary` |
| danger | `danger` (红色边框 + 红色文字) |

| 元素 | 属性 | 值 |
|------|------|-----|
| 宽度 | 固定 | `400px` |
| 标题 | 字号 | `18px` |
| | 字重 | `600` |
| 描述 | 字号 | `14px` |
| | 颜色 | `#888888` |
| | 行高 | `1.5` |
| Footer | 对齐 | `flex-end` |
| | 按钮间距 | `12px` |

### 代码

```tsx
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="w-[400px]">
        <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed mb-6">
            {description}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

---

## 5.5 CodeBlock

### Props

```typescript
interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  maxHeight?: string;
  onCopy?: () => void;
  onApply?: () => void;        // AI 场景：应用代码
}
```

### 像素规范

| 元素 | 属性 | 值 |
|------|------|-----|
| 容器 | 背景 | `#1a1a1a` |
| | 边框 | `1px solid #333333` |
| | 圆角 | `8px` |
| 头部 | 背景 | `#0f0f0f` |
| | 高度 | `36px` |
| | 内边距 | `0 12px` |
| | 下边框 | `1px solid #333333` |
| 语言标签 | 字号 | `11px` |
| | 颜色 | `#666666` |
| | 大写 | `uppercase` |
| 操作按钮 | 尺寸 | `28px x 28px` |
| | 图标大小 | `14px` |
| | 颜色 | `#666666` -> `#ffffff` (hover) |
| | 间距 | `4px` |
| 代码区 | 内边距 | `16px` |
| | 字体 | `JetBrains Mono` |
| | 字号 | `13px` |
| | 行高 | `1.6` |
| | 颜色 | `#e0e0e0` |
| 行号 | 颜色 | `#444444` |
| | 宽度 | `40px` |
| | 右边距 | `16px` |
| | 对齐 | 右对齐 |
| 高亮行 | 背景 | `rgba(255, 255, 255, 0.05)` |

### 代码

```tsx
export function CodeBlock({
  code,
  language,
  showLineNumbers,
  highlightLines = [],
  maxHeight = '400px',
  onCopy,
  onApply,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div className="border border-[#333333] rounded-lg overflow-hidden bg-[#1a1a1a]">
      {/* Header */}
      <div className="
        h-9 px-3 flex items-center justify-between
        bg-[#0f0f0f] border-b border-[#333333]
      ">
        <span className="text-[11px] uppercase text-[#666666]">
          {language || 'code'}
        </span>
        <div className="flex gap-1">
          {onApply && (
            <button
              onClick={onApply}
              className="
                w-7 h-7 flex items-center justify-center rounded
                text-[#666666] hover:text-white hover:bg-[#333333]
              "
              title="Apply"
            >
              <CheckIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="
              w-7 h-7 flex items-center justify-center rounded
              text-[#666666] hover:text-white hover:bg-[#333333]
            "
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Code */}
      <pre
        className="p-4 overflow-auto font-mono text-[13px] leading-relaxed text-[#e0e0e0]"
        style={{ maxHeight }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={highlightLines.includes(i + 1) ? 'bg-white/5 -mx-4 px-4' : ''}
          >
            {showLineNumbers && (
              <span className="inline-block w-10 pr-4 text-right text-[#444444] select-none">
                {i + 1}
              </span>
            )}
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}
```

---

# 第六部分：业务组件参考规范

> **说明**: 本章节定义 features/ 下业务组件的像素规范参考。这些组件位于各自的 feature 模块内，不可跨模块复用。

## 6.1 ProjectCard

### 像素规范

| 元素 | 属性 | 值 |
|------|------|-----|
| 容器 | 高度 | `240px` |
| | 内边距 | `24px` |
| | 边框 | `1px solid #222222` |
| | 边框(hover) | `1px solid #888888` |
| | 背景(hover) | `#1a1a1a` |
| 日期 | 字号 | `10px` |
| | 颜色 | `#888888` |
| | 字母间距 | `0.1em` |
| 标题 | 字号 | `18px` |
| | 颜色 | `#ffffff` |
| | 下边距 | `8px` |
| 摘要 | 字号 | `13px` |
| | 颜色 | `#888888` |
| | 行高 | `1.6` |
| | 行数限制 | `3` |
| 底部 | 上边框 | `1px solid #222222` |
| | 上内边距 | `16px` |

---

## 6.2 HeroCard

### 像素规范

| 元素 | 属性 | 值 |
|------|------|-----|
| 容器 | 最小高度 | `320px` |
| | 边框 | `1px solid #222222` |
| | 边框(hover) | `1px solid #888888` |
| 内容区 | 宽度 | `60%` |
| | 内边距 | `40px` |
| 图片区 | 宽度 | `40%` |
| | 透明度 | `0.4` → `0.6` (hover) |
| | 滤镜 | `grayscale(100%)` |
| 标题 | 字号 | `32px` |
| | 颜色 | `#ffffff` |
| 描述 | 字号 | `15px` |
| | 颜色 | `#888888` |
| | 行高 | `1.6` |
| | 最大宽度 | `500px` |

---

## 6.3 MessageBubble (AI Chat)

### 像素规范

| 角色 | 背景 | 边框 | 文字色 |
|------|------|------|--------|
| user | `#080808` | `1px solid #222222` | `#ffffff` |
| assistant | `transparent` | none | `#ffffff` |

| 属性 | 值 |
|------|-----|
| 圆角 | `8px` |
| 内边距 | `12px` |
| 字号 | `14px` |
| 行高 | `1.6` |

---

## 6.4 CodeBlock (简化版)

> **注意**: 完整的 CodeBlock 规范见第五部分 5.5。此处为业务场景下的简化参考。

### 像素规范

| 元素 | 属性 | 值 |
|------|------|-----|
| 容器 | 背景 | `#1a1a1a` |
| | 边框 | `1px solid #222222` |
| | 圆角 | `8px` |
| 头部 | 背景 | `#111111` |
| | 字号 | `11px` |
| | 字体 | `JetBrains Mono` |
| 代码区 | 内边距 | `12px` |
| | 字号 | `12px` |
| | 字体 | `JetBrains Mono` |
| 操作栏 | 上边框 | `1px solid #222222` |
| | 按钮字号 | `11px` |

---

# 第七部分：页面规范

## 7.1 Login 页面

**设计稿**: `design-255901f0`

### 布局

```
+---------------------------+---------------------------+
|    Left Panel (40%)       |    Right Panel (60%)      |
|    - Brand                |    - Form                 |
|    - Tagline              |                           |
|    - Footer               |                           |
+---------------------------+---------------------------+
```

### 关键样式

| 元素 | 属性 | 值 |
|------|------|-----|
| 左面板 | 宽度 | `40%` |
| | 右边框 | `1px solid #222222` |
| | 内边距 | `48px - 64px` |
| Tagline | 字号 | `30px` |
| | 字重 | `300` |
| 表单容器 | 最大宽度 | `420px` |
| 表单标题 | 字号 | `24px` |
| | 字重 | `500` |
| OAuth 分割线 | 文字 | `OR` |
| | 字号 | `10px` |
| | 颜色 | `#444444` |

---

## 7.2 Dashboard 页面

**设计稿**: `design-a2aabb70`

### 布局

```
+----------+---------------------------+----------+
| Sidebar  |      Main Content         | AI Panel |
| (280px)  |    - Toolbar              | (360px)  |
|          |    - Hero Card            |          |
|          |    - Card Grid            |          |
+----------+---------------------------+----------+
```

### 关键样式

| 元素 | 属性 | 值 |
|------|------|-----|
| Toolbar | 高度 | `80px` |
| 搜索框 | 宽度 | `300px` |
| Section 标题 | 字号 | `14px` |
| | 字重 | `500` |
| 卡片网格 | 列 | `auto-fill, minmax(300px, 1fr)` |
| | 间距 | `24px` |

---

## 7.3 Editor 页面

**设计稿**: `design-a565d21b`

### 布局

```
+----------+---------------------------+----------+
| Sidebar  |      Editor Area          |  Details |
| (280px)  |    - Cover Image          | (240px)  |
|          |    - Title (editable)     |          |
|          |    - Content (TipTap)     |          |
+----------+---------------------------+----------+
```

### 关键样式

| 元素 | 属性 | 值 |
|------|------|-----|
| 封面图 | 高度 | `260px` |
| | 透明度 | `0.5` |
| | 滤镜 | `grayscale` |
| 标题 | 字号 | `48px` |
| | 字重 | `500` |
| | 字体 | `Inter` |
| 正文 | 字号 | `17px` |
| | 行高 | `1.8` |
| | 字体 | `Lora` |
| | 颜色 | `#b0b0b0` |
| | 最大宽度 | `760px` |
| H2 | 字号 | `24px` |
| | 颜色 | `#ffffff` |
| Blockquote | 左边框 | `1px solid #222222` |
| | 左内边距 | `24px` |
| | 颜色 | `#666666` |
| | 风格 | `italic` |

---

## 7.4 Settings Modal

**设计稿**: `design-5d03b9cc`

### 布局

```
+---------------+------------------------------+
|   Nav (260px) |        Content               |
|   - General   |   - Section Title            |
|   - Appearance|   - Setting Items            |
|   - Export    |   - Save/Cancel buttons      |
+---------------+------------------------------+
```

### 关键样式

| 元素 | 属性 | 值 |
|------|------|-----|
| 模态框 | 宽度 | `1000px` |
| | 高度 | `700px` |
| | 背景 | `#0f0f0f` |
| | 边框 | `1px solid #222222` |
| 导航区 | 宽度 | `260px` |
| | 背景 | `#0a0a0a` |
| 导航项(active) | 背景 | `#1a1a1a` |
| | 右边框 | `2px solid #ffffff` |
| Section 标题 | 字号 | `10px` |
| | 大写 | `uppercase` |
| | 字母间距 | `widest` |
| Setting 标题 | 字号 | `14px` |
| | 字重 | `500` |
| Setting 描述 | 字号 | `13px` |
| | 颜色 | `#666666` |

---

# 第八部分：UX 交互规范

> **说明**: 本章节定义用户体验层面的规范，包括用户流程、交互状态、键盘导航、响应式行为等。

---

## 8.1 核心用户流程

### 7.1.1 登录流程

```
[打开应用]
    |
    v
[Login 页面]
    |
    +---> [输入邮箱/密码] ---> [点击登录] ---> [验证中...] ---> [成功] ---> [Dashboard]
    |                                              |
    +---> [OAuth 登录] ---> [跳转第三方]            +---> [失败] ---> [显示错误]
    |
    +---> [忘记密码] ---> [Forgot Password 页面]
    |
    +---> [申请访问] ---> [Register 页面]
```

### 7.1.2 创作流程

```
[Dashboard]
    |
    +---> [点击项目卡片] ---> [Editor 页面]
    |
    +---> [点击 "New Project"] ---> [创建项目对话框] ---> [Editor 页面]

[Editor 页面]
    |
    +---> [编辑文档] ---> [自动保存 (3秒防抖)]
    |
    +---> [打开 AI Panel] ---> [输入问题] ---> [AI 响应流式输出]
    |
    +---> [导出] ---> [Export Dialog] ---> [选择格式] ---> [下载文件]
```

### 8.1.3 设置流程

```
[任意页面]
    |
    +---> [Cmd+, 或点击设置图标] ---> [Settings Modal]
    |
    +---> [选择设置分类] ---> [修改设置项]
    |                              |
    |                              +---> [自动保存到 localStorage]
    |
    +---> [点击遮罩/按 Escape] ---> [关闭 Modal]
```

### 8.1.4 搜索流程

```
[任意页面]
    |
    +---> [Cmd+K 或点击搜索框] ---> [Command Palette]
    |
    +---> [输入关键词] ---> [实时显示结果]
    |                          |
    |                          +---> [项目/文件/命令 分类显示]
    |
    +---> [上/下箭头选择] ---> [Enter 执行/跳转]
    |
    +---> [Escape] ---> [关闭 Palette]
```

### 8.1.5 版本历史流程

```
[Editor 页面]
    |
    +---> [点击 Icon Bar 历史图标] ---> [Version History Panel]
    |
    +---> [浏览版本列表]
    |         |
    |         +---> [点击版本] ---> [预览差异]
    |
    +---> [点击 "Restore"] ---> [确认对话框]
    |                               |
    |                               +---> [确认] ---> [恢复版本] ---> [Toast 提示]
    |                               |
    |                               +---> [取消] ---> [返回列表]
```

### 8.1.6 文件管理流程

```
[Sidebar - File Tree]
    |
    +---> [右键文件/文件夹] ---> [Context Menu]
    |                              |
    |                              +---> [Rename] ---> [内联编辑] ---> [Enter 确认 / Escape 取消]
    |                              |
    |                              +---> [Delete] ---> [确认对话框] ---> [删除并 Toast]
    |                              |
    |                              +---> [New File] ---> [创建并进入编辑]
    |
    +---> [拖拽文件] ---> [移动到目标文件夹] ---> [更新树结构]
```

### 8.1.7 AI 对话流程 (完整)

```
[AI Panel]
    |
    +---> [输入问题] ---> [Enter 发送]
    |                        |
    |                        +---> [显示用户消息]
    |                        |
    |                        +---> [显示 "Thinking..."]
    |                        |
    |                        +---> [流式输出 AI 响应]
    |                                   |
    |                                   +---> [响应完成] ---> [显示操作按钮]
    |                                   |
    |                                   +---> [用户取消] ---> [停止输出] ---> [显示 "Canceled"]
    |
    +---> [点击代码块 "Apply"] ---> [应用到编辑器]
    |
    +---> [点击 "Regenerate"] ---> [重新生成最后响应]
    |
    +---> [点击消息 "Edit"] ---> [编辑已发送消息] ---> [重新发送]
```

---

## 8.2 交互状态规范

### 8.2.1 加载状态 (Loading)

| 场景 | 表现 | 时长阈值 |
|------|------|----------|
| 页面加载 | 全屏骨架屏或 Spinner | > 300ms 时显示 |
| 列表加载 | 列表区域骨架屏 | > 300ms 时显示 |
| 按钮操作 | 按钮内 Spinner，禁用状态 | 立即显示 |
| AI 响应 | "Thinking..." 文字 + 动画点 | 立即显示 |

**骨架屏规范:**
- 背景: `#1a1a1a`
- 动画: `shimmer` 效果，从左到右
- 形状: 与真实内容一致

### 8.2.2 空状态 (Empty)

| 场景 | 内容 |
|------|------|
| 无项目 | 图标 + "No projects yet" + "Create your first project" 按钮 |
| 无搜索结果 | 图标 + "No results found" + "Try different keywords" |
| 无版本历史 | 图标 + "No versions yet" + "Versions are created automatically" |
| 无 AI 对话 | 图标 + "Start a conversation" + 建议问题列表 |

**样式规范:**
- 图标: 48px, `#444444`
- 标题: 16px, `#888888`
- 描述: 13px, `#666666`
- 操作按钮: Primary 或 Secondary

### 8.2.3 错误状态 (Error)

| 类型 | 表现 | 操作 |
|------|------|------|
| 网络错误 | Toast + 内联错误提示 | 重试按钮 |
| 表单验证错误 | 输入框红色边框 + 错误文字 | 自动清除 |
| 权限错误 | Dialog 提示 | 返回/重新登录 |
| 保存失败 | 状态栏红色 + Toast | 重试按钮 |

**错误颜色:**
- 边框: `#ff4444`
- 文字: `#ff4444`
- 背景 (Toast): `#1a1a1a` + 左边框 `#ff4444`

### 8.2.4 成功状态 (Success)

| 场景 | 表现 | 持续时间 |
|------|------|----------|
| 保存成功 | 状态栏 "Saved" + checkmark | 2秒后淡出 |
| 复制成功 | Toast "Copied to clipboard" | 2秒后消失 |
| 创建成功 | Toast + 自动跳转 | 1秒后跳转 |
| 导出成功 | Toast + 下载开始 | 3秒后消失 |

---

## 8.3 键盘导航与快捷键

### 8.3.1 全局快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + K` | 打开命令面板 |
| `Cmd/Ctrl + S` | 保存文档 |
| `Cmd/Ctrl + /` | 打开/关闭 AI Panel |
| `Cmd/Ctrl + [` | 折叠/展开 Sidebar |
| `Cmd/Ctrl + ]` | 折叠/展开 Context Panel |
| `Cmd/Ctrl + ,` | 打开设置 |
| `Escape` | 关闭当前弹窗/面板 |

### 8.3.2 编辑器快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + B` | 加粗 |
| `Cmd/Ctrl + I` | 斜体 |
| `Cmd/Ctrl + U` | 下划线 |
| `Cmd/Ctrl + Shift + S` | 删除线 |
| `Cmd/Ctrl + Z` | 撤销 |
| `Cmd/Ctrl + Shift + Z` | 重做 |

### 8.3.3 焦点管理

| 规则 | 说明 |
|------|------|
| Tab 顺序 | 从左到右，从上到下 |
| 弹窗焦点 | 打开时聚焦第一个可交互元素，关闭时恢复之前焦点 |
| 列表导航 | 上/下箭头切换选中项，Enter 确认 |
| 命令面板 | 自动聚焦搜索框，上/下箭头导航命令 |

---

## 8.4 响应式行为

### 8.4.1 断点定义

| 断点 | 宽度 | 布局变化 |
|------|------|----------|
| Desktop | >= 1280px | 三栏完整显示 |
| Tablet | 768px - 1279px | 隐藏 Context Panel，Sidebar 可折叠 |
| Mobile | < 768px | 单栏布局，底部 Tab 导航 |

### 8.4.2 Tablet 布局

| 元素 | 行为 |
|------|------|
| Icon Bar | 始终可见 (48px) |
| Sidebar | 默认折叠，点击图标以 overlay 展开 |
| Main Content | 占满剩余宽度 |
| Context Panel | 默认隐藏，以 overlay 方式显示 |
| AI Panel | 点击触发，从右侧滑入，宽度 360px |

**Overlay 规范:**
- 背景遮罩: `rgba(0, 0, 0, 0.5)`
- 点击遮罩关闭
- 滑入动画: `300ms ease-out`

### 8.4.3 Mobile 布局

**整体结构:**

```
+----------------------------------+
|  Header (56px)                   |
|  [Back] [Title]         [Actions]|
+----------------------------------+
|                                  |
|  Main Content (全宽)              |
|                                  |
|                                  |
+----------------------------------+
|  Tab Bar (56px)                  |
|  [Home] [Editor] [AI] [Settings] |
+----------------------------------+
```

**Header 规范:**

| 元素 | 属性 | 值 |
|------|------|-----|
| 高度 | - | `56px` |
| 背景 | - | `#080808` |
| 下边框 | - | `1px solid #222222` |
| 返回按钮 | 尺寸 | `40px x 40px` |
| 标题 | 字号 | `16px` |
| | 字重 | `500` |

**Tab Bar 规范:**

| 元素 | 属性 | 值 |
|------|------|-----|
| 高度 | - | `56px` |
| 背景 | - | `#080808` |
| 上边框 | - | `1px solid #222222` |
| Tab 项 | 宽度 | 等分 |
| 图标尺寸 | - | `24px` |
| 标签字号 | - | `10px` |
| 默认颜色 | - | `#666666` |
| 激活颜色 | - | `#ffffff` |
| 激活背景 | - | `transparent` |

**Tab 项:**

| Tab | 图标 | 标签 | 路由 |
|-----|------|------|------|
| Home | home | Home | /dashboard |
| Editor | file-text | Write | /editor |
| AI | bot | AI | /ai |
| Settings | settings | Settings | /settings |

**手势支持:**

| 手势 | 触发位置 | 行为 |
|------|----------|------|
| 左滑 | 屏幕左边缘 | 返回上一页 |
| 下拉 | 列表顶部 | 刷新内容 |
| 长按 | 项目卡片 | 显示操作菜单 |

**Mobile 特殊处理:**

- 所有弹窗改为全屏 Sheet（从底部滑入）
- 键盘弹出时，自动滚动输入框到可见区域
- 禁用 hover 效果，改用 active 状态

---

## 8.5 动画与过渡

### 8.5.1 何时使用动画

| 场景 | 使用动画 | 原因 |
|------|----------|------|
| 页面切换 | 是 | 提供空间感 |
| 面板折叠/展开 | 是 | 保持上下文 |
| 弹窗打开/关闭 | 是 | 吸引注意力 |
| 列表项增删 | 是 | 保持视觉连续性 |
| 按钮 hover | 否 | 即时反馈 |
| 输入框 focus | 否 | 即时反馈 |

### 8.5.2 动画参数

| 类型 | 时长 | 缓动曲线 |
|------|------|----------|
| 微交互 (hover/focus) | 150ms | `ease-out` |
| 面板折叠/展开 | 200ms | `cubic-bezier(0.2, 0.0, 0.2, 1)` |
| 弹窗出现 | 200ms | `ease-out` |
| 弹窗消失 | 150ms | `ease-in` |
| 页面切换 | 300ms | `ease-in-out` |

### 8.5.3 减少动画 (a11y)

当用户开启 `prefers-reduced-motion` 时:
- 禁用所有动画
- 过渡时长设为 0
- 保留必要的状态变化 (颜色/透明度)

---

## 8.6 可访问性 (a11y)

### 8.6.1 颜色对比度

| 元素 | 前景 | 背景 | 对比度 | 状态 |
|------|------|------|--------|------|
| 主文字 | #ffffff | #080808 | 21:1 | WCAG AAA |
| 次要文字 | #888888 | #080808 | 6.6:1 | WCAG AA |
| 占位符 | #666666 | #0f0f0f | 4.5:1 | WCAG AA |
| 禁用文字 | #555555 | #080808 | 3.4:1 | 可接受 (禁用态豁免) |

> **修订**: 占位符颜色从 `#444444` 调整为 `#666666` 以达到 WCAG AA 标准 (4.5:1)。所有 primitives 组件中的 placeholder 颜色需同步更新。

### 8.6.2 屏幕阅读器

| 元素 | ARIA 属性 |
|------|-----------|
| Icon Bar 按钮 | `aria-label`, `aria-current` |
| 折叠面板 | `aria-expanded`, `aria-controls` |
| 弹窗 | `role="dialog"`, `aria-modal` |
| 加载状态 | `aria-busy`, `aria-live` |
| 错误提示 | `role="alert"` |

### 8.6.3 焦点可见性

- 焦点环: `2px solid #ffffff`, `offset 2px`
- 禁止使用 `outline: none` 而不提供替代焦点样式

---

# 第九部分：Agent 推导规则

对于设计稿未覆盖的页面，Agent 必须按以下规则推导。

## 页面映射

| 需推导页面 | 参照基准 |
|-----------|---------|
| Register | Login |
| Forgot Password | Login |
| Command Palette | Settings Modal |
| Export Dialog | Settings Modal |
| File Tree | Sidebar NavGroup |
| Toast | CodeBlock |
| Skills Panel | AI Panel |
| Memory Panel | Context Panel |

## 推导原则

1. **颜色不变**: 只能使用 Design Token 中定义的颜色
2. **圆角一致**: 按组件类型使用对应圆角
3. **间距一致**: 使用最接近的标准间距值
4. **动效一致**: 使用相同的 easing 曲线
5. **字体一致**: 按场景选择正确的字体族

---

# 第十部分：视觉一致性检查清单

实现时必须逐项核对：

## 颜色

- [ ] 背景: `#080808` / `#0f0f0f` / `#1a1a1a`
- [ ] 边框: `#222222` (默认) / `#333333` (hover) / `#444444` (focus)
- [ ] 文字: `#ffffff` / `#888888` / `#444444`
- [ ] 禁止使用任何其他颜色

## 尺寸

### 布局组件

- [ ] Icon Bar: `48px` 宽度，始终可见
- [ ] Sidebar Content: 默认 `240px`，范围 `180-400px`，可折叠
- [ ] Main Content: 最小 `400px`
- [ ] Context Panel: 默认 `280px` (普通) / `360px` (AI)，范围 `240-480px`，可折叠
- [ ] Resizer: 可点击区域 `8px`，可见线 `1px`
- [ ] Toolbar: `60px` 或 `80px` 高度

### 圆角

- [ ] 卡片: `24px`
- [ ] 按钮 (pill): `100px`
- [ ] 按钮 (icon): `8px`
- [ ] 输入框: `4px`
- [ ] Tooltip: `6px`

### 图标

- [ ] Icon Bar 图标按钮: `40px x 40px`
- [ ] Icon Bar 图标大小: `20px`
- [ ] Active 指示器: `2px` 宽，`20px` 高

## 字体

- [ ] UI: `Inter`
- [ ] 正文: `Lora`
- [ ] 代码: `JetBrains Mono`
- [ ] 权重: 300/400/500/600

## 动效

- [ ] 曲线: `cubic-bezier(0.2, 0.0, 0.2, 1)`
- [ ] 时长: 150ms / 200ms / 300ms
- [ ] Tooltip 延迟显示: `300ms`
- [ ] NavItem `+` 指示器滑入正确

## 交互

- [ ] Resizer hover 颜色变化 (#222222 -> #444444)
- [ ] Resizer 拖拽时颜色变化 (#444444 -> #888888)
- [ ] Sidebar 折叠/展开动画平滑
- [ ] Panel 折叠/展开动画平滑
- [ ] Icon Bar 图标 hover 状态正确
- [ ] Icon Bar Active 指示器显示正确

---

# 第十一部分：前后端对齐分析

> **重要**: 本章节分析前端设计与现有后端能力的差距，识别需要新增的后端功能。

---

## 11.1 后端现有能力总结

### IPC 通道清单（95 个）

| 模块 | 通道前缀 | 功能 | 状态 |
|------|----------|------|------|
| 文件操作 | `file:*` | 文件 CRUD、快照、会话状态 | ✅ 已实现 |
| 项目管理 | `project:*` | 项目 CRUD、切换当前项目 | ✅ 已实现 |
| 角色管理 | `character:*` | 角色 CRUD | ✅ 已实现 |
| 大纲管理 | `outline:*` | 大纲读写 | ✅ 已实现 |
| 知识图谱 | `kg:*` | 实体/关系 CRUD | ✅ 已实现 |
| 用户记忆 | `memory:*` | 记忆 CRUD、偏好摄入、注入预览 | ✅ 已实现 |
| 技能管理 | `skill:*` | 技能列表、读写、开关 | ✅ 已实现 |
| AI 功能 | `ai:*` | 技能运行、代理设置、取消 | ✅ 已实现 |
| 上下文管理 | `context:creonow:*` | 对话、规则、设置、监听 | ✅ 已实现 |
| 约束管理 | `constraints:*` | 读写约束 | ✅ 已实现 |
| 判断模型 | `judge:*` | L2 提示、模型状态 | ✅ 已实现 |
| 搜索功能 | `search:*` | 全文搜索、语义搜索 | ✅ 已实现 |
| 向量嵌入 | `embedding:*` | 编码、索引 | ✅ 已实现 |
| RAG 检索 | `rag:*` | 上下文检索 | ✅ 已实现 |
| 版本管理 | `version:*` | 版本创建、列表、恢复、差异 | ✅ 已实现 |
| 更新管理 | `update:*` | 检查、下载、安装、跳过 | ✅ 已实现 |
| 导出功能 | `export:*` | DOCX、PDF、Markdown | ✅ 已实现 |
| 剪贴板 | `clipboard:*` | HTML/文本写入 | ✅ 已实现 |
| 统计功能 | `stats:*` | 今日统计、范围统计、增量 | ✅ 已实现 |
| 本地 LLM | `localLlm:*` | 模型管理、Tab 补全 | ✅ 已实现 |

### 现有数据模型

```typescript
// 项目
type Project = {
  id: string;
  name: string;
  description?: string;
  styleGuide?: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;
}

// 角色
type Character = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  traits?: JsonValue;
  relationships?: JsonValue;
  createdAt: string;
  updatedAt: string;
}

// 用户记忆
type UserMemory = {
  id: string;
  type: 'preference' | 'feedback' | 'style';
  content: string;
  projectId: string | null;
  origin: 'manual' | 'learned';
  createdAt: string;
  updatedAt: string;
}
```

---

## 11.2 前端设计需要但后端缺失的功能

### 11.2.1 用户认证系统 ⚠️ 完全缺失

设计中的 Login 页面需要以下功能，后端完全没有实现：

| 功能 | 设计需求 | 后端状态 | 优先级 |
|------|----------|----------|--------|
| 邮箱/密码登录 | Login 页面核心功能 | ❌ 缺失 | P0 |
| OAuth 登录 | GitHub、SSO 按钮 | ❌ 缺失 | P1 |
| 注册/申请访问 | "Don't have an account? Apply for Access" | ❌ 缺失 | P0 |
| 忘记密码 | "Forgot your password?" 链接 | ❌ 缺失 | P1 |
| Remember Me | 登录保持 checkbox | ❌ 缺失 | P2 |
| 会话管理 | JWT Token、刷新、登出 | ❌ 缺失 | P0 |

**需要新增的 IPC 通道:**

```typescript
// 认证模块
'auth:login'           // { email, password, rememberMe } → { token, user }
'auth:register'        // { email, password, name } → { ok }
'auth:logout'          // {} → { ok }
'auth:refresh'         // { refreshToken } → { token }
'auth:forgot-password' // { email } → { ok }
'auth:reset-password'  // { token, password } → { ok }
'auth:oauth:init'      // { provider: 'github' | 'sso' } → { redirectUrl }
'auth:oauth:callback'  // { code } → { token, user }
'auth:session:get'     // {} → { user | null }
```

**需要新增的数据模型:**

```typescript
type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'free' | 'pro' | 'admin';
  createdAt: string;
  updatedAt: string;
}

type Session = {
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
}
```

---

### 11.2.2 用户账户与设置 ⚠️ 部分缺失

设计中的 Settings Modal 需要以下功能：

| 功能 | 设计需求 | 后端状态 | 差距 |
|------|----------|----------|------|
| 用户资料 | 头像、昵称、邮箱 | ❌ 缺失 | 需要 User 模型 |
| 写作体验设置 | Focus Mode, Typewriter Scroll, Smart Punctuation | ⚠️ 部分 | 需要扩展 settings 存储 |
| 数据与存储 | 自动保存、备份间隔 | ⚠️ 部分 | 需要扩展 |
| 外观设置 | 主题、字体、界面缩放 | ⚠️ 部分 | 需要扩展 |
| 导出与分享 | 默认格式、分享偏好 | ⚠️ 部分 | 需要扩展 |

**需要新增/扩展的 IPC 通道:**

```typescript
// 用户资料
'user:profile:get'     // {} → User
'user:profile:update'  // { name?, avatar? } → User
'user:avatar:upload'   // { file: Blob } → { url }

// 设置扩展（利用现有 context:creonow:settings:*）
// 需要定义标准化的 settings schema
```

**需要定义的 Settings Schema:**

```typescript
type UserSettings = {
  // 写作体验
  writing: {
    focusMode: boolean;           // 专注模式
    typewriterScroll: boolean;    // 打字机滚动
    smartPunctuation: boolean;    // 智能标点
    autoPairBrackets: boolean;    // 自动配对括号
  };
  
  // 数据与存储
  data: {
    autoSaveEnabled: boolean;     // 自动保存
    autoSaveInterval: number;     // 保存间隔（秒）
    backupEnabled: boolean;       // 备份开关
    backupInterval: number;       // 备份间隔（小时）
  };
  
  // 外观
  appearance: {
    theme: 'dark' | 'light' | 'system';
    fontFamily: string;
    fontSize: number;
    uiScale: number;
  };
  
  // 导出
  export: {
    defaultFormat: 'docx' | 'pdf' | 'markdown';
    includeMetadata: boolean;
  };
}
```

---

### 11.2.3 项目状态与分类 ⚠️ 部分缺失

设计中的 Dashboard 显示项目需要更多状态信息：

| 功能 | 设计需求 | 后端状态 | 差距 |
|------|----------|----------|------|
| 项目状态 | Draft / Published / Archived | ❌ 缺失 | Project 模型需扩展 |
| 封面图 | 卡片显示封面图 | ❌ 缺失 | 需要图片上传存储 |
| 标签 | 项目标签分类 | ❌ 缺失 | Project 模型需扩展 |
| 阅读时间 | 预估阅读时长 | ❌ 缺失 | 需要计算逻辑 |
| Collections | 项目分类/集合 | ❌ 缺失 | 需要新模型 |
| 特色项目 | HeroCard 展示 | ❌ 缺失 | 需要 featured 标记 |

**需要扩展的 Project 模型:**

```typescript
type ProjectExtended = {
  // 现有字段
  id: string;
  name: string;
  description?: string;
  styleGuide?: string;
  createdAt: string;
  updatedAt: string;
  
  // 新增字段
  status: 'draft' | 'published' | 'archived';
  coverImage?: string;           // 封面图 URL
  tags: string[];                // 标签
  wordCount: number;             // 字数
  readTime: number;              // 阅读时间（分钟）
  featured: boolean;             // 是否特色
  collectionId?: string;         // 所属集合
  lastOpenedAt?: string;         // 最后打开时间
}

type Collection = {
  id: string;
  name: string;
  description?: string;
  color?: string;                // 标识颜色
  icon?: string;                 // 图标
  order: number;                 // 排序
  createdAt: string;
  updatedAt: string;
}
```

**需要新增的 IPC 通道:**

```typescript
// 图片上传
'upload:image'           // { file: Blob, type: 'cover' | 'avatar' } → { url }

// Collections 管理
'collection:create'      // { name, description?, color?, icon? } → Collection
'collection:list'        // {} → Collection[]
'collection:update'      // { id, ...updates } → Collection
'collection:delete'      // { id } → { ok }

// 项目扩展
'project:publish'        // { id } → Project
'project:archive'        // { id } → Project
'project:setFeatured'    // { id, featured } → Project
'project:addToCollection' // { projectId, collectionId } → Project
```

---

### 11.2.4 分享功能 ⚠️ 完全缺失

设计中的 Editor 页面有 "Share" 按钮：

| 功能 | 设计需求 | 后端状态 |
|------|----------|----------|
| 生成分享链接 | 点击 Share 生成链接 | ❌ 缺失 |
| 分享权限 | 查看/编辑权限 | ❌ 缺失 |
| 分享链接访问 | 无需登录查看 | ❌ 缺失 |
| 撤销分享 | 取消分享链接 | ❌ 缺失 |

**需要新增的 IPC 通道:**

```typescript
// 分享模块
'share:create'    // { projectId, permission: 'view' | 'edit', expiresIn? } → ShareLink
'share:list'      // { projectId } → ShareLink[]
'share:revoke'    // { shareId } → { ok }
'share:get'       // { token } → { project, content } (无需认证)

type ShareLink = {
  id: string;
  projectId: string;
  token: string;               // 分享 token
  permission: 'view' | 'edit';
  expiresAt?: string;
  createdAt: string;
  accessCount: number;         // 访问次数
}
```

---

### 11.2.5 统计功能扩展 ⚠️ 需要扩展

设计中的 Context Panel 显示详细统计：

| 功能 | 设计需求 | 后端状态 | 差距 |
|------|----------|----------|------|
| 今日字数 | 数字显示 | ✅ `stats:getToday` | 已实现 |
| 周目标追踪 | 进度条 + 目标设置 | ⚠️ 部分 | 需要目标存储 |
| 活动记录 | 近期活动列表 | ❌ 缺失 | 需要活动日志 |
| 存储使用 | 已用/总量 | ❌ 缺失 | 需要计算逻辑 |
| 写作趋势 | 图表数据 | ⚠️ 部分 | `stats:getRange` 可用 |

**需要扩展的统计功能:**

```typescript
// 扩展 stats 模块
'stats:goal:get'         // {} → { weeklyGoal: number, monthlyGoal: number }
'stats:goal:set'         // { weeklyGoal?, monthlyGoal? } → { ok }
'stats:activity:list'    // { limit?, offset? } → Activity[]
'stats:storage:get'      // {} → { used: number, total: number }

type Activity = {
  id: string;
  type: 'create' | 'edit' | 'delete' | 'publish' | 'share' | 'export';
  projectId?: string;
  projectName?: string;
  description: string;
  timestamp: string;
}
```

---

## 11.3 数据模型对比与扩展需求

### 现有模型 vs 设计需求

| 模型 | 现有字段 | 设计需要新增 | 状态 |
|------|----------|--------------|------|
| **User** | 不存在 | 全部字段 | ❌ 新建 |
| **Project** | id, name, description, styleGuide, createdAt, updatedAt | status, coverImage, tags, wordCount, readTime, featured, collectionId, lastOpenedAt | ⚠️ 扩展 |
| **Collection** | 不存在 | 全部字段 | ❌ 新建 |
| **ShareLink** | 不存在 | 全部字段 | ❌ 新建 |
| **Activity** | 不存在 | 全部字段 | ❌ 新建 |
| **UserSettings** | 部分存在于 settings 文件 | 标准化 schema | ⚠️ 标准化 |

### 数据库 Schema 扩展建议

```sql
-- 用户表（新建）
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,           -- 本地认证
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT DEFAULT 'free',     -- free | pro | admin
  oauth_provider TEXT,          -- github | sso | null
  oauth_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 会话表（新建）
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 项目表扩展
ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'draft';
ALTER TABLE projects ADD COLUMN cover_image TEXT;
ALTER TABLE projects ADD COLUMN tags TEXT;          -- JSON array
ALTER TABLE projects ADD COLUMN word_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN read_time INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN featured INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN collection_id TEXT;
ALTER TABLE projects ADD COLUMN last_opened_at TEXT;

-- 集合表（新建）
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 分享链接表（新建）
CREATE TABLE share_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  token TEXT UNIQUE NOT NULL,
  permission TEXT NOT NULL,     -- view | edit
  expires_at TEXT,
  access_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 活动日志表（新建）
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id),
  description TEXT NOT NULL,
  metadata TEXT,                -- JSON
  created_at TEXT NOT NULL
);

-- 用户设置表（新建/替代文件存储）
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  settings TEXT NOT NULL,       -- JSON (UserSettings schema)
  updated_at TEXT NOT NULL
);

-- 写作目标表（新建）
CREATE TABLE writing_goals (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  weekly_goal INTEGER DEFAULT 7000,
  monthly_goal INTEGER DEFAULT 30000,
  updated_at TEXT NOT NULL
);
```

---

## 11.4 实现优先级建议

### Phase 1：MVP（无认证）

> 目标：先实现 UI，使用 mock 数据或本地单用户模式

| 功能 | 说明 | 后端工作量 |
|------|------|------------|
| 项目状态扩展 | 添加 status/coverImage/tags 字段 | 小 |
| Collections | 新建模型和 CRUD | 中 |
| Settings 标准化 | 定义 schema，扩展现有 API | 小 |
| 统计目标 | 周目标存储和读取 | 小 |

### Phase 2：认证与账户

> 目标：实现用户系统

| 功能 | 说明 | 后端工作量 |
|------|------|------------|
| 邮箱/密码认证 | 注册、登录、登出 | 中 |
| 会话管理 | JWT Token、刷新 | 中 |
| 用户资料 | Profile CRUD | 小 |
| OAuth | GitHub/SSO 集成 | 大 |

### Phase 3：协作与分享

> 目标：实现分享功能

| 功能 | 说明 | 后端工作量 |
|------|------|------------|
| 分享链接 | 生成、访问、撤销 | 中 |
| 活动日志 | 记录用户操作 | 小 |
| 存储统计 | 计算用户数据量 | 小 |

### Phase 4：云服务（Sprint 7 规划）

> 目标：Pro 用户云同步

| 功能 | 说明 | 后端工作量 |
|------|------|------------|
| Supabase 集成 | 云端数据库 | 大 |
| Stripe 订阅 | 付费系统 | 大 |
| 云同步 | 本地-云端同步 | 大 |

---

## 11.5 前端可先行实现的功能（无需等待后端）

以下功能前端可以先用 localStorage / mock 实现，后续再对接后端：

| 功能 | 前端实现方案 | 后续对接 |
|------|--------------|----------|
| Login 页面 UI | 静态页面，点击跳转 Dashboard | 对接 auth:* API |
| Settings Modal | localStorage 存储设置 | 对接 settings API |
| Collections 列表 | localStorage 存储 | 对接 collection:* API |
| 项目状态筛选 | 前端过滤 | 后端 project:list 支持 filter |
| 写作目标 | localStorage 存储目标值 | 对接 stats:goal:* API |
| 活动记录 | 前端内存记录 | 对接 stats:activity:* API |

---

## 11.6 API 契约新增清单

### 新增 IPC 通道汇总

```typescript
// ===== 认证模块 (auth:*) =====
'auth:login'             // P0
'auth:register'          // P0
'auth:logout'            // P0
'auth:refresh'           // P0
'auth:forgot-password'   // P1
'auth:reset-password'    // P1
'auth:oauth:init'        // P1
'auth:oauth:callback'    // P1
'auth:session:get'       // P0

// ===== 用户模块 (user:*) =====
'user:profile:get'       // P1
'user:profile:update'    // P1
'user:avatar:upload'     // P2

// ===== 上传模块 (upload:*) =====
'upload:image'           // P1

// ===== 集合模块 (collection:*) =====
'collection:create'      // P1
'collection:list'        // P1
'collection:update'      // P2
'collection:delete'      // P2

// ===== 项目扩展 =====
'project:publish'        // P2
'project:archive'        // P2
'project:setFeatured'    // P2
'project:addToCollection' // P1

// ===== 分享模块 (share:*) =====
'share:create'           // P2
'share:list'             // P2
'share:revoke'           // P2
'share:get'              // P2

// ===== 统计扩展 =====
'stats:goal:get'         // P1
'stats:goal:set'         // P1
'stats:activity:list'    // P2
'stats:storage:get'      // P2
```

### 类型定义追加

```typescript
// 追加到 src/types/ipc-generated.ts

// ===== Auth =====
type AuthLoginPayload = { email: string; password: string; rememberMe?: boolean };
type AuthLoginData = { token: string; refreshToken: string; user: User };

type AuthRegisterPayload = { email: string; password: string; name: string };
type AuthRegisterData = { ok: true };

type AuthOAuthInitPayload = { provider: 'github' | 'sso' };
type AuthOAuthInitData = { redirectUrl: string };

// ===== User =====
type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'free' | 'pro' | 'admin';
  createdAt: string;
  updatedAt: string;
};

type UserProfileUpdatePayload = { name?: string; avatar?: string };

// ===== Collection =====
type Collection = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type CollectionCreatePayload = { name: string; description?: string; color?: string; icon?: string };
type CollectionUpdatePayload = { id: string } & Partial<CollectionCreatePayload>;

// ===== Share =====
type ShareLink = {
  id: string;
  projectId: string;
  token: string;
  permission: 'view' | 'edit';
  expiresAt?: string;
  createdAt: string;
  accessCount: number;
};

type ShareCreatePayload = { projectId: string; permission: 'view' | 'edit'; expiresIn?: number };
type ShareGetData = { project: Project; content: string };

// ===== Stats Extension =====
type WritingGoal = { weeklyGoal: number; monthlyGoal: number };
type Activity = {
  id: string;
  type: 'create' | 'edit' | 'delete' | 'publish' | 'share' | 'export';
  projectId?: string;
  projectName?: string;
  description: string;
  timestamp: string;
};
type StorageStats = { used: number; total: number; unit: 'bytes' };

// ===== UserSettings =====
type UserSettings = {
  writing: {
    focusMode: boolean;
    typewriterScroll: boolean;
    smartPunctuation: boolean;
    autoPairBrackets: boolean;
  };
  data: {
    autoSaveEnabled: boolean;
    autoSaveInterval: number;
    backupEnabled: boolean;
    backupInterval: number;
  };
  appearance: {
    theme: 'dark' | 'light' | 'system';
    fontFamily: string;
    fontSize: number;
    uiScale: number;
  };
  export: {
    defaultFormat: 'docx' | 'pdf' | 'markdown';
    includeMetadata: boolean;
  };
};
```

---

## 11.7 临时方案：单用户本地模式

在用户认证系统完成前，前端可采用以下临时方案：

### 方案描述

1. **跳过登录页面**: 直接进入 Dashboard
2. **默认用户**: 使用硬编码的本地用户
3. **本地存储**: 所有数据存储在本地 SQLite
4. **设置**: 使用 localStorage + 现有 context:creonow:settings API

### 实现方式

```typescript
// src/lib/auth/local-user.ts
export const LOCAL_USER: User = {
  id: 'local-user',
  email: 'local@creonow.app',
  name: 'Local User',
  role: 'pro', // 本地模式默认 Pro
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// src/stores/authStore.ts
export const useAuthStore = create<AuthState>((set) => ({
  user: LOCAL_USER,           // 默认本地用户
  isAuthenticated: true,      // 默认已认证
  isLoading: false,
  
  // 预留 API 对接
  login: async (payload) => { /* 后续实现 */ },
  logout: async () => { /* 后续实现 */ },
}));
```

### 路由保护

```typescript
// src/routes/ProtectedRoute.tsx
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  // 本地模式始终返回 true
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}
```

---

## 11.8 总结：差距一览表

| 类别 | 设计需求 | 后端状态 | 优先级 | 工作量 |
|------|----------|----------|--------|--------|
| **用户认证** | 登录/注册/OAuth | ❌ 完全缺失 | P0 | 大 |
| **用户账户** | 资料/头像 | ❌ 完全缺失 | P1 | 中 |
| **项目状态** | Draft/Published/Archived | ❌ 缺失 | P1 | 小 |
| **封面图** | 上传/存储/显示 | ❌ 缺失 | P1 | 中 |
| **标签/分类** | Tags + Collections | ❌ 缺失 | P1 | 中 |
| **分享功能** | 生成/访问/撤销 | ❌ 完全缺失 | P2 | 中 |
| **设置标准化** | Schema 定义 | ⚠️ 部分 | P1 | 小 |
| **统计扩展** | 目标/活动/存储 | ⚠️ 部分 | P1 | 小 |

### 建议执行顺序

1. **立即可做**: 项目状态扩展、Settings 标准化、统计目标
2. **Phase 1**: Collections、封面图上传、Tags
3. **Phase 2**: 用户认证、账户管理
4. **Phase 3**: 分享功能、活动日志
5. **Sprint 7**: 云服务、订阅
