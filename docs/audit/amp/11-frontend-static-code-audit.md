# 11 — 前端全面审计：静态 + 动态（Impeccable Skills 深度版）

更新时间：2026-03-07

> "不闻不若闻之，闻之不若见之，见之不若知之，知之不若行之。"——荀子《儒效》
>
> 本文档不同于 07 的设计完整度审查。07 以 **用户视角** 逐模块检查假 UI、i18n 缺失与交互断线；本文件则以 **代码静态分析 + 动态构建验证** 双重方法，使用 VS Code Impeccable 前端专用 Skills 做全量扫描，量化问题规模，划定红线与修复优先级。
>
> 动态审计部分基于实际运行 `pnpm typecheck`、`pnpm lint`、`pnpm test:unit`、`pnpm storybook:build`，并分析编译产物（CSS bundle、JS chunk）得出。

---

## 文档索引

| § | 章节 | 内容 |
|---|------|------|
| 零 | ⚠️ 后续 Agent 强制技能要求 | **前端任务必须启用的 Impeccable Skills 清单** |
| 一 | 审计范围与方法论 | 静态 + 动态分析手段、扫描范围、与 07 的关系 |
| 二 | 审计总览：记分卡 | 14 大维度评分摘要 |
| 三 | P0 阻断问题（必须在 v0.1 前修复） | 阻断发布的 4 类问题 |
| 四 | P1 高优问题（v0.1 后首批修复） | 影响质量感的 5 类问题 |
| 五 | P2 中优问题（持续演进） | 架构债与可维护性 |
| 六 | 正面发现（值得保持） | 值得作为团队规范固化的优秀实践 |
| 七 | 模块级问题热力图 | 每模块问题密度排名 |
| 八 | 修复路线图 | 按阶段排列的行动项 |
| 九 | 审计证据附录 | 扫描命令与原始数据 |
| **十** | **动态审计：构建与运行时验证** | **typecheck / lint / test / storybook 实际执行结果** |
| **十一** | **动态审计：性能反模式** | **transition-all、布局动画、触控目标、代码分割** |
| **十二** | **动态审计：无障碍深度检查** | **对比度计算、aria-label 覆盖、heading 层级、键盘导航** |
| **十三** | **动态审计：AI Slop 反模式检测** | **设计是否有"AI 味"、品牌辨识度评估** |
| **十四** | **动态审计：Token 合规门禁 & Story 覆盖率** | **CI 门禁实测、暗色/亮色 Token 对齐、懒加载、表单验证** |

---

## 零、⚠️ 后续 Agent 强制技能要求

> **所有处理前端 UI / 样式 / 组件 / 交互任务的 Agent，在动手前必须加载并使用以下 Impeccable 前端专用 Skills。仅靠通用编码能力处理界面任务，不符合 CreoNow 的质量标准。**

### 必须使用的 Skills（按场景）

| 场景 | 必选 Skill | 说明 |
|------|-----------|------|
| 新建组件 / 页面 | **frontend-design** | 生成高设计品质的生产级前端界面，避免"AI 味"模板 |
| 修改已有组件 | **audit** + **critique** | 先审计当前状态，再评估设计效能 |
| 样式 / Token 变更 | **normalize** + **extract** | 确保符合 Design System，提取可复用 Token 与模式 |
| 错误提示 / 文案 | **clarify** + **harden** | 改善 UX 文案，增强边界场景鲁棒性 |
| 动效 / 交互增强 | **animate** + **polish** | 添加有意义的微交互，完成发布前最终打磨 |
| 响应式 / 多端适配 | **adapt** | 确保跨尺寸 / 上下文的一致体验 |
| 降噪 / 视觉减压 | **quieter** + **distill** | 降低视觉攻击性，提炼设计本质 |
| 品牌感 / 情感化 | **colorize** + **delight** + **bolder** | 注入品牌色、愉悦感与视觉记忆点 |
| 首次使用 / 空状态 | **onboard** | 设计引导流与空状态体验 |
| 组件提取到 Design System | **extract** | 识别并固化可复用模式 |
| 性能优化 | **optimize** | 加载、渲染、动画、包体积优化 |

### 加载方式

在 VS Code Chat 中：Agent 接到前端相关任务后，在 prompt 中显式声明使用对应 skill，或在 `.github/copilot-instructions.md` 中配置默认加载。例如：

```
请使用 frontend-design skill 创建这个组件。
请使用 audit + critique skill 评估这个页面。
```

### 禁止行为

- ❌ 不使用任何 Impeccable Skill，直接用通用编码能力处理前端设计任务
- ❌ 只跑 Vitest 测试通过就声称前端任务完成（P-Visual 原则要求视觉验收）
- ❌ 使用 Tailwind 原始色值 / 内置阴影类 / 裸字符串（AGENTS.md 禁令 §五）

---

## 一、审计范围与方法论

### 1.1 扫描范围

| 层级 | 路径 | 文件数 |
|------|------|--------|
| Primitive 组件 | `renderer/src/components/primitives/` | 27 组件 |
| Composite 组件 | `renderer/src/components/composites/` | 10 组件 |
| Layout 组件 | `renderer/src/components/layout/` | 11 组件 |
| Feature 模块 | `renderer/src/features/` | 22 模块 |
| 样式 | `renderer/src/styles/` | main.css, fonts.css, tokens.css |
| Store 层 | `renderer/src/stores/` | 全部 Zustand store |
| 设计源 | `design/system/` | tokens.css, component-cards, state-inventory |

### 1.2 审计方法

1. **grep / ripgrep 正则扫描**：量化原始色值、裸字符串、native HTML 元素、`!important` 使用
2. **AST 级结构分析**：Provider 嵌套深度、组件导出/引用关系
3. **Design Token 交叉验证**：`design/system/01-tokens.css` vs `renderer/src/styles/tokens.css`
4. **Impeccable Skills 多维评估**：使用 audit / critique / frontend-design 三个 Skill 分别评估
5. **AGENTS.md 禁令逐条检查**：§五全部 7 条禁令

### 1.3 与 07 的关系

| 维度 | 07-ui-ux-design-audit | 本文件（11） |
|------|----------------------|-------------|
| 视角 | 用户体验（肉眼可见的断点） | 代码质量（静态分析可检测的问题） |
| 方法 | 模块逐一走查 | 正则扫描 + 交叉验证 |
| 产出 | 假 UI 清单、交互断线、体感评级 | 量化违规数据、热力图、修复路线图 |
| 互补关系 | 07 说"这里体验不好" | 11 说"为什么不好，问题出在哪行代码" |

---

## 二、审计总览：记分卡

| # | 维度 | 评分 | 说明 |
|---|------|------|------|
| 1 | **Design Token 一致性** | ⭐⭐⭐⭐⭐ A+ | tokens.css 100% 同步，main.css 零硬编码值 |
| 2 | **Primitive 组件质量** | ⭐⭐⭐⭐⭐ A | 27 组件近乎完美：Token 化、Radix 基座、状态覆盖全 |
| 3 | **动效与 Reduced Motion** | ⭐⭐⭐⭐ A- | 12 处 prefers-reduced-motion 引用，体系化处理 |
| 4 | **i18n 覆盖率** | ⭐⭐ D | Feature 层 109+ 裸英文字符串，Primitive 层无问题 |
| 5 | **组件复用率** | ⭐⭐ D+ | 94 处 native `<button>`、17+ 处 native `<input>` 绕过 Primitive |
| 6 | **CSS 工程纪律** | ⭐⭐⭐ C+ | 14+ 处 `!important` 覆盖集中在 SearchPanel |
| 7 | **无障碍（a11y）** | ⭐⭐⭐ C | aria-live 仅 4 处，导航/对话框/文件树缺失 |
| 8 | **响应式设计** | ⭐⭐ D | SettingsDialog 固定 1000×700px，多处 min-w 硬编码 |
| 9 | **品牌与情感化设计** | ⭐ F | 无视觉品牌标识，像通用工具而非文学创作 IDE |
| 10 | **构建健康度**（动态） | ⭐⭐⭐⭐⭐ A+ | typecheck / lint / test / storybook 全部 0 错误 |
| 11 | **性能反模式**（动态） | ⭐⭐⭐⭐ B+ | 6-10 处 transition-all，accordion 高度动画，无 React.lazy |
| 12 | **对比度 WCAG**（动态） | ⭐⭐⭐ C- | 暗色 fg-subtle 3.0:1 不达标，fg-placeholder 1.6:1 严重不足 |
| 13 | **AI Slop 反模式**（动态） | ⭐⭐⭐⭐⭐ A+ | 无 AI 味，设计克制、功能导向、无花哨渐变 |
| 14 | **错误边界**（动态） | ⭐⭐⭐⭐⭐ A+ | 1 全局 + 3 区域 ErrorBoundary，隔离测试完备 |

**综合评级：B-** — 基础设施一流（Token A+、Primitive A、ErrorBoundary A+、构建 A+），Feature 层有大面积静态问题（i18n D、复用 D+），但动态验证结果远优于预期。

---

## 三、P0 阻断问题（必须在 v0.1 前修复）

### 3.1 i18n 裸字符串（109+ 处）

**现象**：Feature 模块中大量用户可见文本直接写 English 字面量，未经 `t()` 函数。

**影响**：
- 无法本地化，中文用户看到英文界面
- 违反 AGENTS.md §五第 3 条禁令

**重灾区**（按严重程度排序）：

| 模块 | 裸字符串数 | 典型示例 |
|------|-----------|----------|
| version-history | 20+ | `"Version History"`, `"Restore"`, `"Current"` |
| settings | 15+ | `"Settings"`, `"General"`, `"Appearance"` |
| dashboard | 12+ | `"Recent Projects"`, `"Create New"` |
| ai (AiPanel) | 10+ | `"Ask AI"`, `"Generating..."` |
| search | 8+ | `"Search"`, `"Replace"`, `"No results"` |
| export | 8+ | `"Export as..."`, `"PDF"`, `"Markdown"` |
| onboarding | 6+ | `"Welcome"`, `"Get Started"` |
| character | 5+ | `"Characters"`, `"Add Character"` |
| editor | 5+ | `"Untitled"`, toolbar labels |

**修复规范**：
```tsx
// ❌ 禁止
<span>Version History</span>

// ✅ 必须
<span>{t('versionHistory.title')}</span>
```

**检测命令**：
```bash
grep -rn '"[A-Z][a-z].*"' apps/desktop/renderer/src/features/ \
  --include="*.tsx" | grep -v 'import\|console\|type\|interface\|className\|key='
```

### 3.2 Native HTML 绕过 Primitive 组件（94 处 button + 17 处 input）

**现象**：Feature 层大量使用原生 `<button>` 和 `<input>` 而非仓库 Primitive 组件。

**影响**：
- 样式不一致：原生元素无 Design Token 覆盖
- 状态缺失：无 focus ring、hover、disabled 标准化处理
- 无障碍缺失：Primitive 组件内建 aria 属性被跳过

**分布**：

| 元素 | 总数 | Primitive 替代 |
|------|------|---------------|
| `<button` | 94 处 | `<Button>` (from primitives) |
| `<input` | 17+ 处 | `<Input>` / `<TextInput>` (from primitives) |
| `<select` | 5+ 处 | `<Select>` (Radix-based) |

**重灾区**：version-history、settings、export、character

**检测命令**：
```bash
grep -rn '<button' apps/desktop/renderer/src/features/ --include="*.tsx" | wc -l
grep -rn '<input' apps/desktop/renderer/src/features/ --include="*.tsx" | wc -l
```

### 3.3 StatusBar 硬编码 Locale

**现象**：StatusBar 组件中硬编码 `"en-GB"` / `"en-US"` 作为日期格式 locale。

**影响**：
- 中文用户看到英文日期格式
- 违反 i18n 原则

**位置**：`renderer/src/components/layout/StatusBar/`

**修复方向**：从 i18n context 取当前 locale。

### 3.4 SettingsDialog 固定尺寸溢出

**现象**：SettingsDialog 使用固定 `width: 1000px; height: 700px`。

**影响**：
- 小于 1024×768 的窗口直接溢出
- Electron 允许用户缩放窗口，固定尺寸无法自适应

**修复方向**：改用 `max-w-[min(1000px,90vw)]` + `max-h-[min(700px,85vh)]` + overflow-auto。

---

## 四、P1 高优问题（v0.1 后首批修复）

### 4.1 CSS `!important` 覆盖（14+ 处）

**现象**：SearchPanel 中集中出现 `!important` Tailwind 覆盖。

**根因**：Tailwind CSS 4 层叠优先级不足以覆盖 TipTap 编辑器内联样式，开发者用 `!important` 强行覆盖。

**影响**：
- 样式难以维护和预测
- 后续主题切换可能失效

**位置**：`renderer/src/features/search/SearchPanel.tsx` 及相关

**修复方向**：
1. 使用 Tailwind `@layer` 提升优先级
2. 通过 TipTap extension 在编辑器层面控制样式
3. 如必须覆盖，收敛到 `styles/overrides.css` 统一管理

### 4.2 aria-live 覆盖不足

**现象**：`aria-live` 仅在 4 处使用（Toast、SaveIndicator、SearchPanel、AiPanel）。

**缺失场景**：
- 文件树增删节点后无公告
- 导航切换（IconBar → Sidebar）无公告
- Dialog 打开/关闭无公告
- 版本历史恢复操作无公告

**修复方向**：在 Primitive Dialog / FileTree / Navigation 组件中补充 `aria-live="polite"` 区域。

### 4.3 Storybook 仅展示暗色主题

**现象**：当前 Storybook 构建仅配置暗色主题，亮色主题从未被视觉验证。

**影响**：
- 亮色主题可能全面失效（Token 缺失、对比度不足）
- 发布后切换亮色可能导致不可读界面

**修复方向**：
1. 在 Storybook 配置中启用主题切换 decorator
2. 将亮色/暗色 snapshot 纳入 CI

### 4.4 版本历史模块质量最低

**现象**：version-history 是全仓库前端质量最差的模块。

**问题叠加**：
- 20+ 裸字符串
- 全部使用 native `<button>` / `<div>`
- 无 Primitive 组件引用
- 无 aria 标签
- 硬编码样式

**建议**：该模块需要整体重写，而非逐个修补。

### 4.5 Store Provider 嵌套 11 层

**现象**：App.tsx 中 Context / Store Provider 嵌套达 11 层（Theme→Onboarding→Ai→Project→Editor→File→Kg→Search→Memory→Version→Layout）。

**影响**：
- 顶层任一 Provider 变更触发全树 re-render
- 开发体验差，难以调试组件重渲染原因

**修复方向**：
1. 合并同质 Provider（如多个 Zustand store 不需要 Provider 包裹，直接 hook 调用）
2. 使用 React.lazy 拆分不在首屏需要的 Provider

---

## 五、P2 中优问题（持续演进）

### 5.1 品牌与情感化设计缺失

**现象**：CreoNow 定位为「创作者的 Cursor」，但界面视觉与任何通用开发工具无异。

**缺失项**：
- 无品牌色系或视觉主题
- 无启动画面 / 品牌 Logo 动画
- 空状态无插画或文案温度
- 编辑器无"写作氛围"暗示（如纸张质感、字体选择、行间距微调）

**建议使用 Skill**：`colorize` + `delight` + `bolder` + `onboard`

### 5.2 字体系统未激活

**现象**：`fonts.css` 中声明了 `GeistSans` 和 `GeistMono` 字体，但实际打包中可能未包含字体文件，回退到系统字体。

**影响**：跨平台字体不一致，Windows 和 macOS 渲染差异大。

### 5.3 暗色/亮色主题 Token 完整性

**现象**：Token 系统的 `:root`（亮色）和 `.dark`（暗色）声明完整，但没有自动化门禁确保每个暗色 Token 在亮色中都有对应值。

**修复方向**：CI 门禁脚本检查两套 Token 同名覆盖率。

---

## 六、正面发现（值得保持）

这些是审计中发现的高质量实践，应作为团队规范固化：

### 6.1 Token 三层体系完美落地

`design/system/01-tokens.css` → `renderer/src/styles/tokens.css` → 组件消费。100% 同步，无遗漏、无多余。

### 6.2 main.css 零硬编码值

`main.css` 中无任何硬编码颜色、尺寸或阴影值。所有值通过 CSS 变量引用 Token。这是"Design Token 做到极致"的标杆。

### 6.3 Primitive 组件品质卓越

27 个 Primitive 组件分数接近满分：
- 全部基于 Radix UI 构建
- 全部消费 Design Token
- 状态覆盖完整（hover、focus、disabled、active）
- Focus Ring 正确使用 `outline` 而非 `box-shadow`

### 6.4 prefers-reduced-motion 体系化

12 处 `prefers-reduced-motion` 引用分布在 CSS 和组件中，包含 `transition`、`animation`、`transform` 全覆盖。这在同类项目中属于上乘水准。

### 6.5 SearchPanel 状态机完备

搜索模块的状态处理堪称范本：空查询、无结果、搜索中、有结果、替换确认——五种状态都有对应 UI 和清晰的视觉反馈。

### 6.6 Layout 架构精确匹配 DESIGN_DECISIONS.md

AppShell 双列布局（IconBar + Sidebar | MainContent + RightPanel）完全遵循 `design/DESIGN_DECISIONS.md` 中的布局规范，无偏移。

### 6.7 Resizer 组件体验精致

键盘支持（Arrow + Shift+Arrow）、最小/最大约束、拖拽手柄视觉反馈——超出常见水准。

### 6.8 Component Cards 覆盖 P0 Primitive

`design/system/02-component-cards/` 中包含 Button、Dialog、Toast、Input、Select、Tabs 等核心组件的参考设计卡片，为实现提供了明确的视觉基准。

---

## 七、模块级问题热力图

按问题密度降序排列（🔴 高密 / 🟡 中密 / 🟢 低密）：

| 模块 | 密度 | 裸字符串 | Native HTML | !important | a11y 缺失 | 响应式 |
|------|------|---------|-------------|------------|----------|--------|
| version-history | 🔴🔴🔴 | 20+ | ✗ 全量 | — | ✗ 全量 | ✗ |
| settings | 🔴🔴 | 15+ | ✗ 部分 | — | ✗ 部分 | ✗ 固定尺寸 |
| search | 🔴🔴 | 8+ | ✗ 部分 | ✗ 14+ | — | — |
| dashboard | 🔴 | 12+ | ✗ 部分 | — | — | — |
| ai | 🔴 | 10+ | ✗ 部分 | — | ✗ 部分 | — |
| export | 🟡 | 8+ | ✗ 部分 | — | — | — |
| character | 🟡 | 5+ | ✗ 部分 | — | — | — |
| onboarding | 🟡 | 6+ | — | — | — | — |
| editor | 🟡 | 5+ | — | — | — | — |
| layout (StatusBar) | 🟡 | — | — | — | — | ✗ locale |
| primitives | 🟢 | — | — | — | — | — |
| composites | 🟢 | — | — | — | — | — |

---

## 八、修复路线图

### Phase 0（v0.1 发布前）

| ID | 任务 | 涉及模块 | Skill |
|----|------|---------|-------|
| S0-01 | i18n 全量扫描 + 补齐 Features 层裸字符串 | 全部 features | harden + clarify |
| S0-02 | 替换 Features 层 native `<button>` → Primitive `<Button>` | version-history, settings, export, character | normalize + extract |
| S0-03 | 替换 Features 层 native `<input>` → Primitive `<Input>` | settings, search | normalize |
| S0-04 | 修复 StatusBar 硬编码 locale | layout | harden |
| S0-05 | SettingsDialog 响应式改造 | settings | adapt |

### Phase 1（v0.1 后首批）

| ID | 任务 | 涉及模块 | Skill |
|----|------|---------|-------|
| S1-01 | 消除 SearchPanel `!important` 覆盖 | search | normalize |
| S1-02 | 补充 aria-live 到 Dialog / FileTree / Navigation | primitives, layout | harden |
| S1-03 | Storybook 启用亮色主题 + CI snapshot | 配置 | audit |
| S1-04 | version-history 模块整体重写 | version-history | frontend-design + harden |
| S1-05 | 评估并拆分 Provider 嵌套 | App.tsx | optimize |

### Phase 2（持续演进）

| ID | 任务 | Skill |
|----|------|-------|
| S2-01 | 品牌视觉建立：色系、Logo、Splash Screen | colorize + delight + bolder |
| S2-02 | 空状态插画与文案温度 | onboard + delight |
| S2-03 | 写作氛围视觉暗示（纸张质感、专注模式增强） | frontend-design + polish |
| S2-04 | 字体系统激活与跨平台验证 | adapt |
| S2-05 | 暗色/亮色 Token 覆盖率 CI 门禁 | extract |

---

## 九、审计证据附录

### 9.1 扫描命令

```bash
# 裸字符串扫描（Features 层）
grep -rn '"[A-Z][a-z].*"' apps/desktop/renderer/src/features/ \
  --include="*.tsx" | grep -v 'import\|console\|type\|interface\|className\|key=' | wc -l

# Native button 计数
grep -rn '<button' apps/desktop/renderer/src/features/ --include="*.tsx" | wc -l

# Native input 计数
grep -rn '<input' apps/desktop/renderer/src/features/ --include="*.tsx" | wc -l

# !important 计数
grep -rn '!important' apps/desktop/renderer/src/features/ --include="*.tsx" | wc -l
grep -rn '!important' apps/desktop/renderer/src/styles/ --include="*.css" | wc -l

# Tailwind 原始色值扫描
grep -rn 'bg-\(red\|blue\|green\|yellow\|gray\|slate\|zinc\)-' \
  apps/desktop/renderer/src/ --include="*.tsx" | wc -l

# prefers-reduced-motion 引用
grep -rn 'prefers-reduced-motion\|reduced-motion' \
  apps/desktop/renderer/src/ --include="*.css" --include="*.tsx" | wc -l

# aria-live 使用
grep -rn 'aria-live' apps/desktop/renderer/src/ --include="*.tsx" | wc -l

# Design Token 同步验证
diff <(grep '^  --' design/system/01-tokens.css | sort) \
     <(grep '^  --' apps/desktop/renderer/src/styles/tokens.css | sort)
```

### 9.2 关键数据汇总

| 指标 | 数值 | 备注 |
|------|------|------|
| Features 层裸英文字符串 | 109+ | 全部需走 `t()` |
| Features 层 native `<button>` | 94 | 应使用 Primitive `<Button>` |
| Features 层 native `<input>` | 17+ | 应使用 Primitive `<Input>` |
| `!important` 使用 | 14+ | 集中在 SearchPanel |
| `prefers-reduced-motion` 引用 | 12 | 优秀 |
| `aria-live` 使用 | 4 | 不足，需扩充 |
| Design Token 同步偏差 | 0 | 完美 |
| Primitive 组件数 | 27 | 品质卓越 |
| Composite 组件数 | 10 | 品质良好 |
| Provider 嵌套深度 | 11 层 | 需优化 |
| 设计参考 HTML 文件 | 35 | 覆盖全面 |

---

# 动态审计篇

> "纸上得来终觉浅，绝知此事要躬行。"——陆游《冬夜读书示子聿》
>
> 以下章节基于实际执行构建、测试、Storybook 编译和 CSS 产物分析，不再是 grep 估算，而是**从编译到运行的全链路验证**。

---

## 十、动态审计：构建与运行时验证

### 10.1 构建管线全绿

| 检查项 | 命令 | 结果 | 耗时 |
|--------|------|------|------|
| TypeScript 类型检查 | `pnpm typecheck` | ✅ 0 error | — |
| ESLint & 自定义规则 | `pnpm lint` | ✅ 0 error, 0 warning | — |
| 单元测试（core config） | `pnpm test:unit` (vitest.config.core.ts) | ✅ 12 files, 45 tests passed | 1.62s |
| 单元测试（renderer config） | `pnpm test:unit` (vitest.config.ts) | ✅ 全部通过 | — |
| Token 合规门禁 | `token-global-compliance.test.ts` | ✅ 6/6 rules passed | 1.19s |
| Storybook 构建 | `pnpm -C apps/desktop storybook:build` | ✅ 59 stories built | 16s |
| Storybook 清单一致性 | storybook-inventory check | ✅ 59/59 mapped | — |

**结论**：构建管线为 A+ 级，无隐藏的编译错误或被跳过的测试。

### 10.2 Token 合规门禁详解

文件 `renderer/src/__tests__/token-global-compliance.test.ts` 已在 CI 中运行，覆盖 6 条规则：

| 规则 | 检测内容 | 状态 |
|------|---------|------|
| `bare-shadow` | `shadow-lg` / `shadow-xl` / `shadow-2xl` 未经 var() 包裹 | ✅ 生产代码无违规 |
| `raw-tailwind-color` | `bg-red-600` 等裸 Tailwind 色值 | ✅ 无违规 |
| `bare-white-black` | `text-white` / `bg-black` 等未走 Token | ✅ 无违规 |
| `hardcoded-hex` | className 中直接使用 `#xxx` | ✅ 无违规 |
| `hardcoded-rgba` | className 中直接使用 `rgba()` | ✅ 无违规 |
| `file-discovery` | 能扫描到生产 .tsx 文件 | ✅ |

**注意**：该门禁排除了 `*.stories.*`、`*.test.*`、`styles/`、`__tests__/` 目录。Stories 中仍存在少量硬编码色值（`bg-[#121212]`、`text-[#bfbfbf]`），虽不触发门禁，但影响 Storybook 一致性。

### 10.3 CSS Bundle 产物分析

从 `storybook-static/assets/preview-*.css`（编译产物）中发现：

| 发现 | 详情 | 影响 |
|------|------|------|
| 固定像素字体大小 | `text-[9px]` 至 `text-[32px]`，共 230 处（生产代码） | 不走 Token 字号系统，text-scaling 断裂 |
| 固定像素尺寸约束 | `w-[Npx]`、`h-[Npx]` 等 54 处（features 层） | 响应式受限 |
| `transition-all` | 6-10 处（Card、Toggle、Radio、ImageUpload、LoadingState） | 触发全属性动画，含 layout 属性 |
| Accordion 高度动画 | `@keyframes accordion-down/up` 动画 `height` 属性 | 每帧 layout reflow |
| Storybook 仅暗色主题 | `ThemeDecorator` 硬编码 `data-theme="dark"` | 亮色主题从未视觉验证 |

### 10.4 JS Bundle 体积分析（Storybook 产物）

| Chunk | 体积 | 备注 |
|-------|------|------|
| `DocsRenderer-*.js` | 884 KB | Storybook 框架代码（不影响生产） |
| `index-BcR7jcGp.js` | 660 KB | 共享库（React/Radix 等） |
| `EditorToolbar-*.js` | 359 KB | ⚠️ 编辑器工具栏，体积偏大 |
| `AppShell-*.js` | 101 KB | ⚠️ 主布局组件，含全部 feature import |
| `KnowledgeGraph-*.js` | 83 KB | 知识图谱可视化 |

**Key insight**：`AppShell` 101 KB 说明所有 feature 模块同步 import，无 `React.lazy` 代码分割。

---

## 十一、动态审计：性能反模式

### 11.1 `transition-all` 滥用（🔴 P1）

`transition-all` 会动画所有 CSS 属性（包括 `width`、`height`、`margin` 等触发 layout 的属性），每帧触发 reflow。

| 文件 | 行 | 建议替换 |
|------|-----|---------|
| `components/primitives/Card.tsx` | L33 | `transition-colors transition-shadow` |
| `components/primitives/Toggle.tsx` | L44, L68 | `transition-colors transition-opacity` |
| `components/primitives/Radio.tsx` | L339, L435 | `transition-colors` |
| `components/primitives/ImageUpload.tsx` | L227 | `transition-opacity transition-shadow` |
| `components/patterns/LoadingState.tsx` | L146 | `transition-opacity` |

### 11.2 Accordion 高度动画（🟡 P2）

```css
/* main.css — 当前实现 */
@keyframes accordion-down {
  from { height: 0; }          /* ❌ layout property */
  to { height: var(--radix-accordion-content-height); }
}
```

**修复方案**：使用 `grid-template-rows: 0fr → 1fr` 替代 height 动画，或改用 `clip-path` / `max-height`。

### 11.3 触控目标不达标（🔴 P0）

| 组件 | 元素尺寸 | WCAG 2.2 要求 | 差距 |
|------|---------|-------------|------|
| `SearchInput.tsx` 清除按钮 | 20×20px (`h-5 w-5 p-0`) | 44×44px | -24px |
| `RightPanel.tsx` 关闭/操作按钮 | 24×24px (`w-6 h-6`) | 44×44px | -20px |

**修复**：为小图标按钮添加 `min-w-[44px] min-h-[44px]` 或足够的 padding。

### 11.4 无 React.lazy / 代码分割（🟡 P2）

**现状**：`AppShell.tsx` 同步 import 全部 22 个 feature 模块，无 `React.lazy`、无 `Suspense`。

**影响**：初始 JS 加载体积包含所有功能模块代码，即使用户只看 Dashboard。

**推荐懒加载候选**（按体积/使用频率排序）：

| 模块 | 估算体积 | 触发条件 | 优先级 |
|------|---------|---------|--------|
| KnowledgeGraphPanel | 83 KB | 侧边栏切换 | P1 |
| VersionHistoryPanel | 大 | 侧边栏切换 | P1 |
| SettingsDialog | 大 | 菜单打开 | P1 |
| ExportDialog | 25 KB | 菜单打开 | P2 |
| MemoryPanel | 中 | 侧边栏切换 | P2 |

### 11.5 Hook 质量（✅ 正面）

| 指标 | 状态 |
|------|------|
| `useEffect` 依赖数组 | ✅ 全部显式声明，无无限循环 |
| `useMemo` 使用 | ✅ 40+ 处，覆盖昂贵计算 |
| `useCallback` 使用 | ✅ 50+ 处，回调函数正确缓存 |
| `useState` 条件分支 | ✅ 未发现违规 |

---

## 十二、动态审计：无障碍深度检查

### 12.1 对比度分析（🔴 P0 — 暗色主题）

| Token 对 | 暗色值 | 对比度 | WCAG AA | 状态 |
|---------|--------|--------|---------|------|
| `fg-default` / `bg-base` | #ffffff / #080808 | ~20:1 | AAA | ✅ |
| `fg-muted` / `bg-base` | #888888 / #080808 | ~4.2:1 | AA | ⚠️ 勉强及格 |
| `fg-subtle` / `bg-base` | #666666 / #080808 | ~3.0:1 | **不达标** | ❌ |
| `fg-placeholder` / `bg-base` | #444444 / #080808 | ~1.6:1 | **严重不足** | ❌ |
| `fg-muted` / `bg-surface` | #888888 / #0f0f0f | ~4.0:1 | AA | ⚠️ 勉强 |

**亮色主题**对比度普遍优于暗色：

| Token 对 | 亮色值 | 对比度 | 状态 |
|---------|--------|--------|------|
| `fg-default` / `bg-base` | #1a1a1a / #ffffff | ~20:1 | ✅ |
| `fg-muted` / `bg-base` | #666666 / #ffffff | ~6.3:1 | ✅ |
| `fg-subtle` / `bg-base` | #888888 / #ffffff | ~4.7:1 | ✅ |
| `fg-placeholder` / `bg-base` | #999999 / #ffffff | ~3.8:1 | ⚠️ |

**修复建议**：
- `--color-fg-subtle`（暗色）：从 #666666 提升到至少 #777777（达到约 3.6:1 → 4.5:1 需 #888）
- `--color-fg-placeholder`（暗色）：从 #444444 提升到至少 #555555
- Placeholder 文字按 WCAG 2.2 不强制 4.5:1，但 1.6:1 过低

### 12.2 aria-label 覆盖率（✅ 基础完善）

| 区域 | 状态 | 详情 |
|------|------|------|
| IconBar 导航按钮（7 个） | ✅ 全部有 `aria-label` | 使用 i18n `t()` 键 |
| IconBar 设置按钮 | ✅ | `aria-label={t("workbench.iconBar.settings")}` |
| Primitive Button 组件 | ✅ | 支持 `aria-label` 透传 |
| Feature 层对话框图标 | ⚠️ 需逐个排查 | CharacterPanel / ExportDialog 未完全验证 |

### 12.3 Heading 层级（✅ 规范）

| 页面 | 层级使用 | 状态 |
|------|---------|------|
| OnboardingPage | h2（步骤标题） | ✅ 一致 |
| DashboardPage | h2（Hero 标题） | ✅ 无跳级 |
| OutlinePanel | h1/h2/h3（文档大纲） | ✅ 语义正确 |
| 主编辑区 | ⚠️ 应有页面级 h1 | 可能缺失 |

### 12.4 键盘导航（✅ 优秀）

| 指标 | 数值 | 状态 |
|------|------|------|
| `onKeyDown` 处理器 | 29 处 | ✅ 全面覆盖 |
| `role="button"` + `tabIndex` + `onKeyDown` | 6 处全部配对 | ✅ |
| 文件树箭头键导航 | FileTreePanel | ✅ |
| 命令面板快捷键 | CommandPalette | ✅ |
| 编辑器快捷键层 | EditorPane | ✅ |

### 12.5 错误边界（✅ 顶级）

| 层级 | 组件 | 位置 |
|------|------|------|
| 全局 | `ErrorBoundary` | `main.tsx` L25 |
| Sidebar 区域 | `RegionErrorBoundary` | `AppShell.tsx` L922 |
| Editor 区域 | `RegionErrorBoundary` | `AppShell.tsx` L948 |
| RightPanel 区域 | `RegionErrorBoundary` | `AppShell.tsx` L998 |
| 测试覆盖 | `AppShell.error-boundary.test.tsx` | ✅ 隔离验证 |

**设计理念**：侧边栏崩溃不影响编辑器，编辑器崩溃不影响侧边栏——**区域隔离，优雅降级**。

---

## 十三、动态审计：AI Slop 反模式检测

依据 Impeccable `critique` skill 的 Anti-Pattern 清单逐条检查：

| AI Slop 特征 | 检测结果 | 备注 |
|-------------|---------|------|
| 渐变文字 (gradient text) | ❌ 未发现 | ✅ |
| 暗色模式发光强调 | ❌ 未发现 | ✅ 仅用 opacity 微调 |
| 磨砂玻璃效果 (glassmorphism) | ❌ 未发现 | ✅ |
| Hero 指标面板 | ❌ 未发现 | Dashboard 是写作中心，非数据仪表盘 |
| 千篇一律卡片网格 | ❌ 未发现 | ProjectCard 有差异化设计 |
| 弹跳动画 (bounce ease) | ❌ 未发现 | ✅ 全部使用 cubic-bezier |
| AI 调色板 (紫蓝渐变) | ❌ 未发现 | 主色调为纯黑白 + 语义色 |
| 通用字体（Inter 全家桶） | ⚠️ 部分 | UI 用 Inter（合理），正文用 Lora (serif) 区分 |
| 圆角过度 | ❌ 未发现 | 使用 Token 控制，有 `radius-sm/md/lg` 层级 |

**结论**：Anti-Pattern 检测 **PASS**。CreoNow 的设计是克制的、功能导向的，没有"AI 味"。但这同时也意味着——它太克制了。作为一个面向作家的创作工具，需要注入更多**文学气质与品牌温度**（见 §五 品牌缺失问题）。

---

## 十四、动态审计：Token 对齐、Story 覆盖率、懒加载与表单验证

### 14.1 暗色/亮色 Token 对齐（⚠️ 需修复）

亮色主题缺失以下 Token（暗色中存在但亮色中未声明）：

| 缺失 Token | 暗色值 | 影响 |
|-----------|--------|------|
| 无缺失 | — | ✅ 两套 Token 已在代码层面完整声明 |

> 经验证，暗色和亮色 Token 块结构一致。之前的探索报告中提到的 5 个缺失 Token 经复查确认**已存在于亮色块中**（tokens.css 的 `:root[data-theme="light"]` 区段包含完整的 btn-danger / btn-success / window-close-hover 声明）。

### 14.2 Storybook Story 覆盖率（⚠️ 存在缺口）

总计 59 个 Story 文件，覆盖 23 个 Primitive + 7 个 Layout + 29 个 Feature。

**有 Story 的主要模块**：
- ✅ Dashboard (9 stories)
- ✅ Onboarding (4 stories)
- ✅ Projects (9 stories)
- ✅ FileTree (14 stories)
- ✅ AI Panel (多 stories)
- ✅ Character (1 story)
- ✅ QualityGates (12 stories)
- ✅ Export (有 stories)
- ✅ VersionHistory (有 stories)
- ✅ EditorToolbar (有 stories)

**缺少 Story 的重要组件**：

| 缺失模块 | 源文件行数 | 优先级 |
|---------|-----------|--------|
| SearchPanel | 546 行 | P0 |
| SettingsDialog | 多文件 | P1 |
| MemoryPanel | 420 行 | P1 |
| KnowledgeGraphPanel | 1091 行 | P1 |
| AnalyticsPage | — | P2 |
| InlineDiffControls | — | P2 |
| SlashCommandPanel | — | P2 |

### 14.3 React.lazy / 代码分割（❌ 完全缺失）

| 指标 | 现状 |
|------|------|
| `React.lazy` 使用 | 0 处 |
| `import()` 动态导入（生产代码） | 0 处 |
| `Suspense` 边界（生产代码） | 0 处 |

所有 22 个 Feature 模块在 AppShell 中同步 import，首屏加载包含全部代码。

### 14.4 表单验证（✅ Zod 基座完备）

| 场景 | 验证方式 | 状态 |
|------|---------|------|
| Store 持久化 | Zod schema + `validateOrDefault` | ✅ |
| CommandPalette 输入 | Zod schema 过滤 | ✅ |
| Theme Store | Zod schema | ✅ |
| CreateProjectDialog | ⚠️ 无显式 Zod，依赖 IPC 后端验证 | 可改进 |
| ExportDialog | ⚠️ TypeScript 类型只读，无 runtime 验证 | 可改进 |
| SettingsDialog | ⚠️ 各 Tab 独立，无统一验证 | 可改进 |

---

## 补充修复路线图（动态审计增补）

在原 §八 基础上增补以下动态发现的行动项：

### Phase 0 增补（v0.1 发布前）

| ID | 任务 | Skill |
|----|------|-------|
| D0-01 | 修复暗色主题 `fg-subtle` / `fg-placeholder` 对比度 | normalize |
| D0-02 | 修复 SearchInput 触控目标 < 44px | harden |
| D0-03 | Storybook 启用暗色 + 亮色双主题 decorator | audit |

### Phase 1 增补

| ID | 任务 | Skill |
|----|------|-------|
| D1-01 | 替换 6-10 处 `transition-all` 为具体属性 | optimize |
| D1-02 | 补充 SearchPanel / SettingsDialog / MemoryPanel / KG 的 Stories | audit + frontend-design |
| D1-03 | 对 KnowledgeGraphPanel / VersionHistory / SettingsDialog 实施 React.lazy | optimize |

### Phase 2 增补

| ID | 任务 | Skill |
|----|------|-------|
| D2-01 | Accordion 动画从 height 改为 grid-template-rows | optimize + animate |
| D2-02 | 230 处固定像素字号迁移到 Token 字号变量 | normalize |
| D2-03 | 为 ExportDialog / CreateProject 添加 Zod runtime schema | harden |

---

> "凡事豫则立，不豫则废。"——《礼记·中庸》
>
> 这份审计不是恐慌清单，而是**北极星**。CreoNow 的基础设施（Token 体系 + Primitive 组件 + 构建管线 + 错误边界）已经是 S 级水准。动态验证证明了静态分析中最令人担忧的问题（Token 违规）其实已被 CI 门禁拦截——真正漏网的是对比度、性能反模式和代码分割这些"静默债务"。
>
> 让"创作者的 Cursor"不仅代码过硬，更在每一个像素、每一帧动画、每一次键盘交互中传递"这是为创作者量身定做的工具"。
