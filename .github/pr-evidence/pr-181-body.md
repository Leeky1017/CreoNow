## 概述

Workbench 左侧 `memory` 面板从占位态升级为可用的列表+详情组件，按黄金设计源补齐搜索、状态态、详情联动、Storybook 与测试覆盖。

Closes #181

## 变更类型

- [x] Feature（新功能）
- [x] Fix（修复）
- [ ] Docs（文档）
- [ ] Refactor（重构）
- [x] Test（测试）
- [ ] CI/Infra（工程）

## 影响范围

- `apps/desktop/renderer/src/features/workbench/WorkbenchApp.tsx`
- `apps/desktop/renderer/src/features/workbench/components/MemoryPanel.tsx`
- `apps/desktop/renderer/src/features/workbench/components/MemoryPanel.stories.tsx`
- `apps/desktop/renderer/src/features/workbench/components/__tests__/MemoryPanel.test.tsx`
- `apps/desktop/renderer/src/features/workbench/__tests__/WorkbenchApp.test.tsx`
- `apps/desktop/renderer/src/i18n/config.ts`
- `apps/desktop/renderer/src/styles/index.css`
- `apps/desktop/preload/src/index.ts`
- `apps/desktop/renderer/src/lib/preloadApi.ts`

---

## 阶段 A：设计文档

### 涉及的 Invariants

- INV-1：仅 renderer 读接口与展示层改动，不触发新的写路径
- INV-2：未新增并发写逻辑；保持既有串行/控制器边界
- INV-6：未新增裸调 LLM；仅接入既有 `memory:simple:list` IPC
- INV-7：未绕过既有调用边界；renderer 继续经 preload bridge
- INV-10：memory IPC 错误透传并展示，不静默吞错

### 模块边界图

- Renderer `WorkbenchApp` -> `PreloadApi.memory.list` -> IPC `memory:simple:list`
- 新增 `MemoryPanel` 仅负责视图状态与交互，不包含主进程业务逻辑

### Definition of Done

- 左侧 memory 面板具备 `loading/error/empty/no-match/ready`
- 支持搜索过滤、列表选择、详情联动、重试
- i18n 文案完整，样式走现有 token
- Storybook + 测试 + typecheck + preflight 全部通过

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

- `pnpm -C apps/desktop test:renderer -- src/features/workbench/components/__tests__/MemoryPanel.test.tsx src/features/workbench/__tests__/WorkbenchApp.test.tsx` ✅
- `pnpm --filter @creonow/desktop typecheck` ✅
- `pnpm -C apps/desktop storybook:build` ✅

## Visual Evidence

### Embedded Screenshots

![Memory Panel Ready](https://raw.githubusercontent.com/Leeky1017/CreoNow/task/181-fe-08-memory-panel-alignment/.github/pr-evidence/pr-181-memory-panel-ready.png)

### Storybook Artifact / Link

- Link: https://github.com/Leeky1017/CreoNow/tree/task/181-fe-08-memory-panel-alignment/apps/desktop/storybook-static
- Visual acceptance note: 截图展示了 ready 态的列表与详情联动，且与 Storybook 的 `Features/Workbench/MemoryPanel` 视觉结构一致。

- [ ] N/A（非前端改动）

## Risk & Rollback

- 风险：`WorkbenchApp` 左侧 panel 切换逻辑新增 memory 分支，若回归会表现为 memory 面板空白或错误态常驻。
- 回滚：回滚本 PR commit，恢复原有 placeholder 行为；不影响主进程数据结构。

## 审计门禁

**审计模型配置（1+1+1+Duck）：**
- 工程：Claude Opus 4.6 (high)
- 审计 1（同模型）：Claude Opus 4.6 (high)
- 审计 2：Claude Sonnet 4.6 (high)
- 审计 3（Rubber Duck）：GPT-5.4 (xhigh)
- 评论汇总：Claude Opus 4.6 (high)

- [x] 审计 1（Claude Opus 4.6）：FINAL-VERDICT ACCEPT
- [x] 审计 2（Claude Sonnet 4.6）：FINAL-VERDICT ACCEPT
- [ ] 审计 3（GPT-5.4）：FINAL-VERDICT SKIPPED-user-requested-2-subagent-cross-audit

---

## Final Checklist

- [x] 全程在 `.worktrees/issue-<N>-<slug>` 中完成
- [x] `pnpm typecheck` 通过
- [x] 相关测试通过
- [x] 无 `any` 类型
- [x] 前端改动：Storybook 可构建、无硬编码颜色/间距、新组件有 Story
