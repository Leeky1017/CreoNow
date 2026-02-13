# Tasks: P1+P2 Integration Check Document

## 1. Specification

- 创建 `docs/plans/p1p2-integration-check.md`，包含 12 个检查大项
- 对照实际代码验证文档中的关键断言
- 通过交付流程合并回 main

## 2. TDD Mapping（先测前提）

文档类任务，无代码实现，无 TDD 映射。验证方式为代码审查 + grep 确认。

## 3. Red（先写失败测试）

N/A — 文档类任务。

## 4. Green（最小实现通过）

- [x] 创建 `docs/plans/p1p2-integration-check.md`（13 章节）
- [x] 对照代码验证并修正 §1.1 Chain A 调用链描述
- [x] 对照代码验证并修正 §7 assembleSystemPrompt 死代码发现
- [x] 对照代码验证并修正 §2.1 token 估算一致性结论
- [x] 对照代码验证并修正 §6.1 p1-chat-skill 测试文件名
- [x] 对照代码验证并修正 §10 BLOCKER 列表

## 5. Refactor（保持绿灯）

N/A — 文档类任务。

## 6. Evidence

- RUN_LOG: `openspec/_ops/task_runs/ISSUE-505.md`
- 文档: `docs/plans/p1p2-integration-check.md`
- PR: https://github.com/Leeky1017/CreoNow/pull/506
