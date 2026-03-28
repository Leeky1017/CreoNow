# 前端视觉质量指南

> **前置阅读**：`AGENTS.md`（必读）→ 本文档
> **用途**：前端任务的视觉质量标准与操作流程。
> **何时阅读**：实现或修改 `renderer/` 下任何组件前。

---

## 一、CreoNow 视觉 DNA

| 维度 | 风格 | 实现要点 |
|------|------|---------|
| 色温 | 冷灰色调，中性偏冷 | 使用 `--color-bg-*` / `--color-fg-*` 语义 Token |
| 密度 | 紧凑但有呼吸感 | 4px/8px 网格，`--space-*` Token |
| 边界 | 轻微分割线 | `1px solid var(--color-separator)` |
| 圆角 | 中等圆角 | `var(--radius-md)`（犹豫时选 md） |
| 阴影 | 轻柔阴影 | `var(--shadow-*)` Token，禁止 `shadow-lg/xl/2xl` |
| 动效 | 快速精确 | `var(--duration-fast)` + `var(--ease-default)` |
| 字体 | Inter（UI）Lora（正文）JetBrains Mono（代码） | 已本地打包 14 个 woff2 |
| 图标 | Lucide 线性，1.5px stroke | CI guard 限制只用 `lucide-react` |
| 留白 | 8px 节奏 | `--space-2`(8px) 为基础单位 |
| 品牌 | 克制的强调色 | `var(--color-accent)` |

---

## 二、Design Token 使用规则

### 必须走 Token 的属性

| 属性类型 | Token 前缀 | 示例 |
|---------|-----------|------|
| 颜色 | `--color-*` | `bg-[var(--color-bg-surface)]` |
| 间距 | `--space-*` | `p-[var(--space-3)]` |
| 字号 | `--text-*` | `text-[length:var(--text-body)]` |
| 圆角 | `--radius-*` | `rounded-[var(--radius-md)]` |
| 阴影 | `--shadow-*` | 使用 `--shadow-*` 自定义属性 |
| 动效时长 | `--duration-*` | `transition: var(--duration-fast)` |
| 缓动函数 | `--ease-*` | `var(--ease-default)` |

### 绝对禁止

| 禁止项 | 正确做法 |
|--------|---------|
| 硬编码 hex/rgba（`#0f0f0f`、`rgba(...)`) | 使用 `var(--color-*)` |
| Tailwind 原始色值（`bg-gray-800`） | 使用语义 Token |
| Tailwind 内置阴影（`shadow-lg`） | 使用 `--shadow-*` |
| 硬编码间距（`p-[12px]`） | 使用 `var(--space-*)` |
| 裸字符串字面量 | 使用 `t()` i18n |

### Token 源文件

**唯一主源**：`apps/desktop/renderer/src/styles/tokens.css`（待创建）

---

## 三、视觉验收与交付清单

每个前端 PR 只有同时满足以下全部 10 项，才具备可交审资格；缺任何一项都视为未完成：

| # | 检查项 | 验证方式 |
|---|--------|---------|
| 1 | 所有颜色使用 Token | 无 hex/rgba 硬编码 |
| 2 | 所有间距使用 Token 或 4px 网格 | 无 `p-[Npx]` 等 |
| 3 | 所有用户可见文本使用 `t()` | 无裸字符串 |
| 4 | hover/focus/active/disabled 有过渡 | 使用 `--duration-*` + `--ease-*` |
| 5 | 过渡使用 Token | `var(--duration-fast) var(--ease-default)` |
| 6 | 新组件有 Storybook Story | `.stories.tsx` 文件存在 |
| 7 | Storybook 可构建 | `pnpm -C apps/desktop storybook:build` |
| 8 | PR 正文直接嵌入至少 1 张截图 | Reviewer 打开 PR 即可见 |
| 9 | PR 提供可点击 Storybook artifact/link | Reviewer 可直接打开 |
| 10 | PR 写明视觉验收说明 | 说明截图 / Storybook 验收了哪些状态 |

---

## 四、视觉上下文注入流程

**前端任务开始前，Agent 必须按顺序执行：**

1. **读取 Token 文件**：`apps/desktop/renderer/src/styles/tokens.css`（待创建）
2. **读取组件规范卡片**：`design/system/02-component-cards/<组件名>.md`（如存在）
3. **通过 Figma MCP 读取设计上下文**：如 Issue 附 Figma 链接，优先用 MCP 加载
4. **检查视觉参考**：`design/references/<feature>/`（如存在）
5. **读取 HTML 设计稿**：`design/Variant/designs/<文件>.html`（如存在）
6. **检查可复用组件**：`apps/desktop/renderer/src/components/`（待创建）

---

## 五、组件复用规则

### 组件层级金字塔

| 层级 | 路径 | 说明 |
|------|------|------|
| Primitives | `components/primitives/` | Button、Input、Badge 等基础组件 |
| Composites | `components/composites/` | PanelHeader、EmptyState 等复合组件 |
| Patterns | `components/patterns/` | ErrorState、LoadingState 等模式 |
| Features | `features/` | 业务功能组件 |

### 铁律

- **禁止**在 `features/` 中使用原生 `<button>/<input>/<select>/<textarea>`
- **必须**使用 `primitives/` 中的 `<Button>`/`<Input>`/`<Select>`/`<Textarea>`
- 新建 Primitive 前先确认没有已有组件可复用

---

## 六、交互状态规范

每个可交互元素必须覆盖以下状态：

| 状态 | 必须实现 | Token 参考 |
|------|---------|-----------|
| default | 基础样式 | `--color-bg-surface` |
| hover | 背景变化 + 过渡 | `--color-bg-hover` + `--duration-fast` |
| focus-visible | 可见焦点环 | `--ring-focus-width` + `--ring-focus-color` |
| active/pressed | 轻微缩放或暗化 | `scale(0.98)` |
| disabled | 降低透明度 | `opacity: 0.5, cursor: not-allowed` |
| loading | spinner 替换内容 | `pointer-events: none` |

---

## 七、Figma Make + MCP 工作流

### 设计到代码管线

```
Figma Make 设计优化 → Figma MCP 推送上下文
→ Agent 读取设计结构/样式/布局
→ 结合 tokens.css + 组件库 → 实现代码
→ Storybook 预览 → 视觉验收 → PR
```

### 关键原则

- Agent 不应在没有设计输入（截图/Figma/HTML 设计稿）的情况下做视觉决策
- Figma MCP 优先级 > 截图 > HTML 设计稿 > 文字描述

---

## 八、Storybook 验证流程

### 开发时验证

```bash
pnpm -C apps/desktop storybook        # 本地启动
pnpm -C apps/desktop storybook:wsl    # WSL 环境
```

### CI 验证

```bash
pnpm -C apps/desktop storybook:build  # 必须通过
pnpm test:visual                       # 视觉回归截图对比
```

- 将 Storybook artifact / 预览链接填入 PR 正文，确保 reviewer 可直接点击。
- 将至少 1 张关键状态截图直接嵌入 PR 正文；仅写“本地有截图”或“之后补”都不算完成。

### 视觉迭代建议

1. 构建 Storybook → 检查组件渲染
2. 发现间距不均匀、颜色不协调 → 自行微调
3. 确认 Dark + Light 两个主题下都正常

---

## 九、前端代码审计核心维度

| 审计维度 | 检测方式 | 不合格标准 |
|---------|---------|-----------|
| Token 一致性 | grep 硬编码色值 | 出现 `#xxx` 或原始 Tailwind 色值 |
| 组件复用 | grep `<button\b` / `<input\b` | features/ 中使用原生 HTML 元素 |
| i18n 覆盖 | grep 裸英文字符串 | 用户可见文案未走 `t()` |
| 动效 Token | grep `transition` | 未使用 `--duration-*` / `--ease-*` |
| 无障碍 | 检查 ARIA 属性 | 图标按钮无 `aria-label` |
| 阴影规范 | grep `shadow-lg\|shadow-xl` | 使用 Tailwind 内置阴影类 |
| PR 视觉证据 | 检查 PR 正文 | 无直接可见截图，或仅声明“稍后补” |
| Storybook 交付 | 检查 PR 正文中的链接 | 无可点击 artifact/link，或缺少视觉验收说明 |
