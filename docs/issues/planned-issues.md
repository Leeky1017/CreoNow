# Planned GitHub Issues

> 本文件记录基于 SSOT 前端文档审计发现的待创建 GitHub Issue。
> 来源 PR: #2 (task/ssot-frontend-docs)
>
> **质量要求**：每个条目必须包含精确的 workspace 路径级 spec 引用、至少一条可执行验证命令、明确的组件/场景边界。

---

## Issue 1: Token 拆分 — globals.css → tokens.css + main.css

**标题**: feat(design-system): 拆分 globals.css 为 tokens.css + main.css @theme 桥接

**描述**:
将 `apps/desktop/renderer/src/globals.css` 拆分为三层架构：
- `tokens.css`：包含所有 CSS 变量（`:root` 块）
- `main.css`：包含 `@theme inline` 桥接，将 Token 映射到 Tailwind utility class
- `globals.css`：仅保留 Tailwind 导入和全局样式

**AC**:
- [ ] `tokens.css` 包含所有 CSS 变量定义（覆盖 `openspec/specs/design-system/spec.md` §Typography 预设 Token 完整清单 中列出的 14 个 Token 族）
- [ ] `main.css` 包含 `@theme inline` 块，桥接 typography / weight / tracking / leading Token（按 `openspec/specs/design-system/spec.md` §Requirement: Tailwind v4 桥接层命名规范 中定义的 4 类 namespace）
- [ ] `globals.css` 仅保留 `@import "tailwindcss"` 和必要的全局样式
- [ ] 所有现有组件渲染不受影响
- [ ] 验证命令：`pnpm typecheck && pnpm lint && pnpm -C apps/desktop vitest run`

**Spec 引用**:
- `openspec/specs/design-system/spec.md` §Requirement: Token 分层架构（L21–L31）
- `openspec/specs/design-system/spec.md` §Requirement: Tailwind v4 桥接层命名规范（L83–L161）
- `openspec/specs/design-system/spec.md` §Scenario: 新增 Token 时的同步流程（L196–L203）

**依赖**: PR #2 先完成 Token 定义补全

**Spec 覆盖**:
- Scenario "新增 Token 时的同步流程"（验证三层文件的同步更新）
- Scenario "Tailwind utility class 消费 typography token"（验证 `@theme inline` 桥接后 utility class 可用）

---

## Issue 2: Token 同步 Guard — 01-tokens.css ↔ tokens.css 自动验证

**标题**: feat(ci): 实现 Token 同步 guard (design → runtime)

**描述**:
实现 CI 门禁脚本，自动检测 `design/system/01-tokens.css`（设计源）与 `apps/desktop/renderer/src/styles/tokens.css`（运行时）之间的 Token 不一致。

**AC**:
- [ ] Guard 脚本（如 `scripts/token-sync-gate.ts`）检测两个文件之间的变量名和值不一致
- [ ] CI 中作为 required check 运行
- [ ] 不一致时输出包含文件路径、行号和差异详情的 diff 报告
- [ ] Guard 本身有对应测试文件（`scripts/tests/token-sync-gate.test.ts`）
- [ ] 验证命令：`pnpm tsx scripts/token-sync-gate.ts`

**Spec 引用**:
- `openspec/specs/design-system/spec.md` §Requirement: Token 同步契约（L177–L183）
- `openspec/specs/design-system/spec.md` §Scenario: 新增 Token 时的同步流程（L196–L203）

**依赖**: Issue #1（Token 拆分完成后，才有独立的 `tokens.css` 文件可比对）

**Spec 覆盖**:
- Scenario "新增 Token 时的同步流程"（guard 自动拦截不同步的 Token 变更）

---

## Issue 3: 组件状态覆盖补全

**标题**: feat(primitives): 补全 Button/Input 组件的交互状态

**描述**:
对照 `docs/cn-frontend-ssot/20-design-v3/20.3-component-states.md` 状态矩阵，补全 Button 和 Input 组件的交互状态视觉表达。

**AC**:
- [ ] Button 覆盖 Default / Hover / Active / Focus / Disabled / Loading / Error 7 种状态（对应 `20.3-component-states.md` 通用要求：「所有交互组件必须覆盖以下 7 种状态」）
- [ ] Input 覆盖 Default / Hover / Focus / Filled / Disabled / Error 6 种状态（对应 `20.3-component-states.md` §输入框（AI 面板 + 搜索面板）的 6 行状态矩阵）
- [ ] 每种状态有对应 Storybook Story（文件 `*.stories.tsx`）
- [ ] 交互状态有过渡动画（使用 Token `--duration-fast` / `--ease-out`，参见 `openspec/specs/design-system/spec.md` §Token 命名规范 中动效时长和曲线行）
- [ ] 验证命令：`pnpm -C apps/desktop vitest run Button && pnpm -C apps/desktop vitest run Input`（注：`storybook:build` 脚本尚未配置，Storybook 构建验证需待 Storybook 集成完成后补充）

**Spec 引用**:
- `docs/cn-frontend-ssot/20-design-v3/20.3-component-states.md`（完整文件，涵盖 6 类组件的状态矩阵）
- `openspec/specs/design-system/spec.md` §Requirement: Token 命名规范（L33–L55，动效 Token `--duration-*` / `--ease-*`）
- `docs/references/frontend-visual-quality.md`（视觉验收清单）
- `docs/references/testing-guide.md` §四、前端测试规范（查询优先级：`getByRole` > `getByLabelText` > `getByTestId`）

**依赖**: 无

**Spec 覆盖**:
- Button：7 种状态（Default / Hover / Active / Focus / Disabled / Loading / Error）
- Input：6 种状态（Default / Hover / Focus / Filled / Disabled / Error）
- 不含 IconButton / IconRail / 编辑器工具栏按钮（这些由 GitHub Issue #4 单独覆盖）

---

## Issue 4: Tailwind @theme 桥接

**标题**: feat(design-system): 添加 @theme inline 块桥接 Token 到 Tailwind utility

**描述**:
在 `globals.css`（或拆分后的 `main.css`）中添加 `@theme inline` 块，将 Token 映射到 Tailwind utility class。

**AC**:
- [ ] Typography utility：`text-display` / `text-page-title` / `text-heading` / `text-card-title` / `text-subtitle` / `text-body` / `text-editor` / `text-nav` / `text-caption` / `text-metadata` / `text-label` / `text-tree` / `text-status` / `text-mono`（共 14 个族，每个带 `--line-height` / `--letter-spacing` / `--font-weight` 子属性）
- [ ] Weight utility：`font-light` / `font-normal` / `font-medium` / `font-semibold` / `font-bold`
- [ ] Tracking utility：`tracking-tight` / `tracking-normal` / `tracking-wide`
- [ ] Leading utility：`leading-tight` / `leading-snug` / `leading-normal` / `leading-relaxed` / `leading-loose`
- [ ] 验证命令：`pnpm typecheck && pnpm -C apps/desktop vitest run theme`
- [ ] 使用 `@theme inline`（非 `@theme`），确保值保留 `var()` 引用以支持运行时主题切换（参见 `openspec/specs/design-system/spec.md` §何时用 `@theme` vs `@theme inline`）

**Spec 引用**:
- `openspec/specs/design-system/spec.md` §Requirement: Tailwind v4 桥接层命名规范（L83–L161）
- `openspec/specs/design-system/spec.md` §Scenario: Tailwind utility class 消费 typography token（L187–L195）
- `openspec/specs/design-system/spec.md` §何时用 `@theme` vs `@theme inline`（L157–L162）

**依赖**: Issue #1（Token 拆分）或 PR #2 Token 定义补全

**Spec 覆盖**:
- Scenario "Tailwind utility class 消费 typography token"（验证 `text-display` 等 14 个族的 utility class 生成正确的 CSS）
- Scenario "运行时主题切换时 Token 生效"（验证 `@theme inline` 的 `var()` 引用在主题切换时正确解析）

---

## Issue 5: 设计源文件创建

**标题**: feat(design-system): 创建 design/system/01-tokens.css 权威源文件

**描述**:
创建 `design/system/01-tokens.css` 作为 Token 的权威定义源，与运行时 `apps/desktop/renderer/src/styles/tokens.css`（或当前 `globals.css`）保持同步。

**AC**:
- [ ] `design/system/01-tokens.css` 文件存在于仓库中
- [ ] 包含 `openspec/specs/design-system/spec.md` §Typography 预设 Token 完整清单 中定义的全部 14 个 Token 族（display / page-title / heading / card-title / subtitle / body / editor / nav / caption / metadata / label / tree / status / mono）
- [ ] 包含 §Token 命名规范 中定义的颜色、间距、圆角、阴影、动效、预设 Typography、字重、字间距、行高、字体族、布局尺寸、z-index 共 12 类 Token（注：「间距」合并了「间距+语义间距」，「动效」合并了「动效时长+动效曲线」，spec 表格共 14 行）
- [ ] 变量名和值与运行时文件完全一致
- [ ] 验证命令：`diff <(grep -oP '^\s*--[\w-]+' design/system/01-tokens.css | sort) <(grep -oP '^\s*--[\w-]+' apps/desktop/renderer/src/styles/tokens.css | sort)`（确认变量名集合一致）

**Spec 引用**:
- `openspec/specs/design-system/spec.md` §Requirement: Token 分层架构（L21–L31，源文件层定义）
- `openspec/specs/design-system/spec.md` §Requirement: Token 同步契约（L177–L183）
- `openspec/specs/design-system/spec.md` §Requirement: Token 命名规范（L33–L55，14 行命名模式，合并后 12 类）
- `openspec/specs/design-system/spec.md` §Typography 预设 Token 完整清单（L56–L81，14 族完整清单）

**依赖**: 无

**Spec 覆盖**:
- §Requirement: Token 分层架构（源文件层创建）
- §Requirement: Token 同步契约（建立同步基线）

---

## Issue 6: i18n 集成

**标题**: feat(i18n): 所有组件文本走 t() 国际化

**描述**:
确保所有组件中的用户可见文本通过 `t()` 函数国际化，消除 JSX 裸字符串。

**AC**:
- [ ] `apps/desktop/renderer/` 下所有 `*.tsx` 文件中无 JSX 裸字符串（排除 `className`、`data-testid` 等技术属性）
- [ ] 所有用户可见文本通过 `t()` 函数调用
- [ ] i18n library 已集成并配置（语言包目录和默认 locale 已设定）
- [ ] 验证命令：`pnpm lint`（ESLint 可配置自定义规则 `scripts/eslint-rules/` 拦截裸字符串）或 `grep -rn ">[^{<]*[a-zA-Z]" apps/desktop/renderer/src/components/ --include="*.tsx" | grep -v "className\|data-\|aria-\|testid"` 确认无遗漏

**Spec 引用**:
- `AGENTS.md` §五、禁令（L182–L190，第 3 条：「禁止 JSX 裸字符串——所有文本走 `t()` / i18n」）
- `docs/references/frontend-visual-quality.md`（视觉合格标准：「文本走 `t()` i18n」）

**依赖**: i18n library setup（需先选型并集成 i18n 框架，如 `react-i18next`）

**Spec 覆盖**:
- `AGENTS.md` §五、禁令 第 3 条的全量执行
- 覆盖范围：`apps/desktop/renderer/src/components/` 下所有 `primitives/` 和 `composites/` 组件
