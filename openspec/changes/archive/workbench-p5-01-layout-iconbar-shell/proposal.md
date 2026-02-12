# 提案：workbench-p5-01-layout-iconbar-shell

## 背景

IconBar 存在两个 S0 级缺陷：

1. S0-2：图标顺序与 Spec 不一致（已由 Change 00 delta spec 重新定义最终顺序）。
2. S0-3：激活指示条使用矩形边框高亮 + 背景色，而非 Spec 要求的左侧 2px 白色指示条（`--color-accent`）。

此外，三栏布局的折叠动画过渡、偏好持久化完整性、Storybook 覆盖度需要验证和补齐。

## 变更内容

- 按 Change 00 delta spec 确认的最终顺序调整 `IconBar.tsx` 的 `MAIN_ICONS` 数组：files → search → outline → versionHistory → memory → characters → knowledgeGraph
- 将 IconBar 激活态从矩形边框高亮改为左侧 2px `--color-accent` 白色指示条
- 确认图标 24px、按钮区域 40×40px、居中对齐（flexbox）
- 确认悬停反馈：`background: var(--color-bg-hover)`，过渡 `var(--duration-fast)`
- 确认所有按钮有 `aria-label` 属性
- 验证侧栏展开/折叠过渡使用 `var(--duration-slow)`
- 验证 `creonow.layout.sidebarCollapsed` / `sidebarWidth` 正确持久化
- 补齐 Storybook Story：AppShell 四种折叠态组合；IconBar 默认态/激活态/悬停态

## 受影响模块

- Workbench — `renderer/src/components/layout/IconBar.tsx`、`renderer/src/components/layout/AppShell.tsx`
- Store — `renderer/src/stores/layoutStore.tsx`（持久化验证）

## 依赖关系

- 上游依赖：
  - `workbench-p5-00-contract-sync` — IconBar 最终列表和顺序定义
- 下游依赖：
  - `workbench-p5-05-hardening-gate` — 依赖本 change 完成后再做全局硬化

## 不做什么

- 不修改 Sidebar 内部面板内容（各面板由各自模块负责）
- 不实现 ProjectSwitcher（→ Change 02）
- 不修改 RightPanel 结构（→ Change 03）
- 不实现 zod 校验/去抖等鲁棒性增强（→ Change 05）

## 审阅状态

- Owner 审阅：`APPROVED`
