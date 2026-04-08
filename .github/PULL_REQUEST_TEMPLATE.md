## 概述

<!-- 一句话描述这个 PR 做了什么 -->

Closes #<!-- Issue 编号 -->

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

<!-- 每条勾选表示「遵守」或「不涉及」。若违反，取消勾选并在行末括号内注明理由。 -->

- [ ] **INV-1 原稿保护** — AI 写操作经 Permission Gate + 版本快照
- [ ] **INV-2 并发安全** — isConcurrencySafe 标记正确，未标记的串行执行
- [ ] **INV-3 CJK Token** — Token 估算区分 CJK/ASCII，未使用 UTF8_BYTES/4
- [ ] **INV-4 Memory-First** — 未新增额外向量存储（KG+FTS5 为主检索路径，现有 sqlite-vec/RAG 作为降级补充保留）
- [ ] **INV-5 叙事压缩** — AutoCompact 保留 KG 实体、角色设定、未解伏笔
- [ ] **INV-6 一切皆 Skill** — 新能力通过 Skill 体系注册，未裸调 LLM
- [ ] **INV-7 统一入口** — 操作走 CommandDispatcher.execute()，禁止 IPC handler 直调 Service
- [ ] **INV-8 Hook 链** — 写操作后 post-writing hooks 正常触发
- [ ] **INV-9 成本追踪** — AI 调用已记录 model/tokens/费用
- [ ] **INV-10 错误不丢上下文** — 中断时生成错误事件，未静默丢弃

---

## Validation Evidence

<!-- 贴出测试运行结果、类型检查、lint 结果或 CI 门禁摘要 -->

-

## Visual Evidence

<!-- 前端改动必须在本节直接嵌入至少 1 张截图；仅写"本地有截图 / 之后补"视为未完成 -->
<!-- 不涉及前端的改动写 N/A -->

### Embedded Screenshots

<!-- 直接把截图粘贴到此处，确保 reviewer 打开 PR 即可见 -->

N/A

### Storybook Artifact / Link

<!-- 前端改动填写可点击链接；非前端改动写 N/A -->

- Link:
- Visual acceptance note:

- [ ] N/A（非前端改动）

## Risk & Rollback

<!-- 本次改动最可能出什么问题？如何回滚？ -->

-

## 审计门禁

<!-- 以下由审计流程自动填写，PR 作者不要修改 -->

**审计模型配置：**
- 工程：GPT-5.3 Codex (xhigh)
- 审计 1：GPT-5.4 (xhigh)
- 审计 2：GPT-5.3 Codex (xhigh)
- 审计 3：Claude Opus 4.6 (high)
- 审计 4：Claude Sonnet 4.6 (high)
- 评论汇总：Claude Opus 4.6 (high)

**审计强制规则：**
- 四个审计席位都必须做独立全量审计（不分维度，不分工种）。
- 任一 finding（含 non-blocking / suggestion / nit）= `REJECT`。
- 只有四席都 `zero findings` 且 `FINAL-VERDICT: ACCEPT`，才可合并。
- Reviewer（Claude Opus 4.6 high）必须发布一条评论，并在该评论中原样（verbatim）粘贴四份审计报告。

- [ ] 审计 1（GPT-5.4）：FINAL-VERDICT ___
- [ ] 审计 2（GPT-5.3 Codex）：FINAL-VERDICT ___
- [ ] 审计 3（Claude Opus 4.6）：FINAL-VERDICT ___
- [ ] 审计 4（Claude Sonnet 4.6）：FINAL-VERDICT ___

<!-- 4 个都 ACCEPT 才可合并 -->

---

## Final Checklist

- [ ] 全程在 `.worktrees/issue-<N>-<slug>` 中完成
- [ ] `pnpm typecheck` 通过
- [ ] 相关测试通过
- [ ] 无 `any` 类型
- [ ] 前端改动：Storybook 可构建、无硬编码颜色/间距、新组件有 Story
