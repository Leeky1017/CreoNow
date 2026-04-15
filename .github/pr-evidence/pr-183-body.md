## 概述

按黄金设计源补齐 FE-09~14：在 Workbench 内新增 `Scenarios`、`Calendar`、`Export/Publish`、`Settings Modal`、`Welcome Screen` 五块能力，并完成 preload bridge、i18n、样式、Storybook 与测试覆盖。

Closes #183

## 变更类型

- [x] Feature（新功能）
- [x] Fix（修复）
- [ ] Docs（文档）
- [ ] Refactor（重构）
- [x] Test（测试）
- [ ] CI/Infra（工程）

## 影响范围

- `apps/desktop/renderer/src/features/workbench/WorkbenchApp.tsx`
- `apps/desktop/renderer/src/features/workbench/RendererApp.tsx`
- `apps/desktop/renderer/src/features/workbench/components/{ScenariosPanel,CalendarPanel,ExportPublishModal}.tsx`
- `apps/desktop/renderer/src/features/settings/SettingsModal.tsx`
- `apps/desktop/renderer/src/features/onboarding/WelcomeScreen.tsx`
- `apps/desktop/preload/src/index.ts`
- `apps/desktop/renderer/src/lib/preloadApi.ts`
- `apps/desktop/renderer/src/i18n/config.ts`
- `apps/desktop/renderer/src/styles/index.css`
- `apps/desktop/renderer/src/features/workbench/components/__tests__/*`
- `apps/desktop/renderer/src/features/{settings,onboarding}/*.{test,stories}.tsx`
- `apps/desktop/renderer/src/features/workbench/__tests__/RendererApp.test.tsx`

---

## 阶段 A：设计文档

### 涉及的 Invariants

- INV-1：导出入口保持在既有 IPC + service 之上，不新增绕过 Permission Gate 的 AI 写路径
- INV-2：仅新增 UI 状态与事件回调，无并发写流程改造
- INV-6：未新增裸调 LLM；仍通过既有 skill/orchestrator 路径
- INV-7：renderer 继续经 preload bridge 调用 IPC，不直连 main service
- INV-9：导出/发布 UI 不改 cost pipeline，仅消费既有进度与错误事件
- INV-10：新增面板均实现 error state，可见错误而非静默吞掉

### 模块边界图

- Renderer `WorkbenchApp/RendererApp` → `PreloadApi` → IPC (`export:document:*`)
- `SettingsModal`、`WelcomeScreen`、`ScenariosPanel`、`CalendarPanel`、`ExportPublishModal` 均为纯 renderer 组件
- 无新增 main 层业务入口；仅扩展 preload API 映射

### Definition of Done

- Workbench 左侧 `Scenarios/Calendar` 可用，具备 loading/error/empty/no-match/ready
- `Export/Publish` 与 `Settings Modal` 从工作台可打开，行为可测
- 首次进入 dashboard（且无项目）展示欢迎引导，完成后持久化 localStorage 标记
- 文案走 i18n，样式走现有 token，新增组件有 Story，测试/类型检查通过

---

## 阶段 B：Invariant Checklist

- [x] **INV-1 原稿保护** — AI 写操作经 Permission Gate + 版本快照
- [x] **INV-2 并发安全** — isConcurrencySafe 标记正确，未标记的串行执行
- [x] **INV-3 CJK Token** — Token 估算区分 CJK/ASCII，未使用 UTF8_BYTES/4
- [x] **INV-4 Memory-First** — 未新增额外向量存储（KG+FTS5 为主检索路径，现有 sqlite-vec/RAG 作为降级补充保留）
- [x] **INV-5 叙事压缩** — AutoCompact 保留 KG 实体、角色设定、未解伏笔
- [x] **INV-6 一切皆 Skill** — 新能力通过 Skill 体系注册，未裸调 LLM
- [x] **INV-7 统一入口** — 操作走 CommandDispatcher.execute()，禁止 IPC handler 直调 Service
- [x] **INV-8 Hook 链** — 写操作后 post-writing hooks 正常触发
- [x] **INV-9 成本追踪** — AI 调用已记录 model/tokens/费用
- [x] **INV-10 错误不丢上下文** — 中断时生成错误事件，未静默丢弃

---

## Validation Evidence

- `pnpm --filter @creonow/desktop typecheck` ✅
- `pnpm --filter @creonow/desktop test:renderer` ✅（26 files / 213 tests）
- `pnpm test:unit` ✅（159 files / 2971 tests）
- `pnpm --filter @creonow/desktop storybook:build` ✅
- `bash scripts/agent_pr_preflight.sh` ⏳（待 PR 创建后复跑）

## Visual Evidence

### Embedded Screenshots

![Scenarios Panel](https://raw.githubusercontent.com/Leeky1017/CreoNow/task/183-fe-09-14-workbench-panels/.github/pr-evidence/screenshots/pr-183-scenarios.png)
![Welcome Screen](https://raw.githubusercontent.com/Leeky1017/CreoNow/task/183-fe-09-14-workbench-panels/.github/pr-evidence/screenshots/pr-183-welcome.png)

### Storybook Artifact / Link

- Link: https://github.com/Leeky1017/CreoNow/tree/task/183-fe-09-14-workbench-panels/apps/desktop/storybook-static
- Visual acceptance note: 截图与 Storybook 对应 story（`Workbench/ScenariosPanel`、`Features/Onboarding/WelcomeScreen`）一致，覆盖此次新增主界面入口与首启引导。

- [ ] N/A（非前端改动）

## Risk & Rollback

- 风险：`WorkbenchApp` 新增多个 UI 状态与 modal 开关，若回归会表现为侧栏空白、导出 modal 不可用或首启引导重复弹出。
- 回滚：回滚本 PR commit，即可恢复原占位态与既有 dashboard/workbench 流程，不影响主进程数据结构。

## 审计门禁

**审计模型配置（2-subagent cross-audit，按用户要求）：**
- 审计 1：GPT-5.3-Codex（xhigh）
- 审计 2：GPT-5.3-Codex（xhigh）

- [x] 审计 1：FINAL-VERDICT ACCEPT
- [x] 审计 2：FINAL-VERDICT ACCEPT
- [x] Duck（GPT-5.4）：SKIPPED-user-requested-2-subagent-cross-audit

---

## Final Checklist

- [x] 全程在 `.worktrees/issue-<N>-<slug>` 中完成
- [x] `pnpm typecheck` 通过
- [x] 相关测试通过
- [x] 无 `any` 类型
- [x] 前端改动：Storybook 可构建、无硬编码颜色/间距、新组件有 Story
