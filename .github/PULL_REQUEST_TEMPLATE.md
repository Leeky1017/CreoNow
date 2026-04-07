## 概述

<!-- 一句话描述这个 PR 做了什么 -->

Closes #<!-- Issue 编号 -->

---

## 变更类型

- [ ] Feature（新功能）
- [ ] Fix（修复）
- [ ] Docs（文档）
- [ ] Refactor（重构）
- [ ] Test（测试）
- [ ] CI/Infra（工程）

## 影响范围

<!-- 列出受影响的模块/层/文件范围 -->

---

## 阶段 A：设计文档

<!-- Agent 写代码之前必须先输出以下内容 -->

### 涉及的 Invariants

<!-- 列出本次改动涉及的 INV-* 编号及影响描述 -->

### 模块边界图

<!-- 简要说明涉及哪些模块、依赖方向是否合规 -->

### Definition of Done

<!-- 明确本次 PR 的完成标准 -->

---

## 阶段 B：Invariant Checklist

CI 自动解析以下 Checklist（计划实现，当前由人工审查确认）。
每条必须勾选「遵守」或「不涉及」。如果违反，必须附理由。

- [ ] **INV-1 原稿保护** -- AI 写操作经 Permission Gate + 版本快照
  - 遵守 / 不涉及 / 违反（理由：___）
- [ ] **INV-2 并发安全** -- isConcurrencySafe 标记正确，未标记的串行执行
  - 遵守 / 不涉及 / 违反（理由：___）
- [ ] **INV-3 CJK Token** -- Token 估算区分 CJK/ASCII，未使用 UTF8_BYTES/4
  - 遵守 / 不涉及 / 违反（理由：___）
- [ ] **INV-4 Memory-First** -- 未新增额外向量存储（KG+FTS5 为主检索路径，现有 sqlite-vec/RAG 作为降级补充保留）
  - 遵守 / 不涉及 / 违反（理由：___）
- [ ] **INV-5 叙事压缩** -- AutoCompact 保留 KG 实体、角色设定、未解伏笔
  - 遵守 / 不涉及 / 违反（理由：___）
- [ ] **INV-6 一切皆 Skill** -- 新能力通过 Skill 体系注册，未裸调 LLM
  - 遵守 / 不涉及 / 违反（理由：___）
- [ ] **INV-7 统一入口** -- 操作走 CommandDispatcher（計劃实现，当前 IPC handler 直调 Service），新增操作已注册到 IPC handler
  - 遵守 / 不涉及 / 违反（理由：___）
- [ ] **INV-8 Hook 链** -- 写操作后 post-writing hooks 正常触发
  - 遵守 / 不涉及 / 违反（理由：___）
- [ ] **INV-9 成本追踪** -- AI 调用已记录 model/tokens/费用（`cachedTokens` 接口已预留但当前未传入）
  - 遵守 / 不涉及 / 违反（理由：___）
- [ ] **INV-10 错误不丢上下文** -- 中断时生成错误事件，未静默丢弃
  - 遵守 / 不涉及 / 违反（理由：___）

---

## 验证证据

### 测试

<!-- 贴出测试运行结果或截图 -->
<!-- 粘贴关键验证命令、CI 结果或门禁摘要 -->

-

## Visual Evidence

<!-- 前端改动必须在本节直接嵌入至少 1 张截图；仅写“本地有截图 / 之后补”视为未完成 -->
<!-- 不涉及前端的改动写 N/A -->

### Embedded Screenshots

<!-- 直接把截图粘贴到此处，确保 reviewer 打开 PR 即可见 -->

N/A

### Storybook Artifact / Link

<!-- 前端改动填写可点击链接；非前端改动写 N/A -->

- Link:
- Visual acceptance note:

- [ ] N/A（非前端改动）

## Test Coverage

<!-- 说明新增/修改了哪些测试，测试覆盖了什么回归场景 -->

-

## Risk & Rollback

<!-- 本次改动最可能出什么问题？如何回滚？ -->

-

## Audit Gate

<!-- 只有达到可交审条件后才请求审计 -->

- `scripts/agent_pr_preflight.sh`:
- Required checks:

## Checklist

- [ ] 本 PR 在 `.worktrees/issue-<N>-<slug>` 中完成实现、提 PR、修 CI、回应审计
- [ ] PR 正文包含 `Closes #N`、验证证据、回滚点、审计门禁
- [ ] `scripts/agent_pr_preflight.sh` 通过
- [ ] `pnpm typecheck` 通过
- [ ] 相关测试通过
- [ ] required checks 全绿后才请求审计/合并
- [ ] 前端改动：`pnpm -C apps/desktop storybook:build` 通过
- [ ] 前端改动：PR 正文已直接嵌入至少 1 张截图；无可见视觉证据视为未完成
- [ ] 前端改动：已提供可点击的 Storybook Artifact / Link 与视觉验收说明
- [ ] 无硬编码颜色/间距值（使用 Design Token）
- [ ] 无 `any` 类型
- [ ] 新组件有 Storybook Story
