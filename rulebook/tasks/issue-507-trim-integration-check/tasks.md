# Tasks: issue-507-trim-integration-check

## 1. Specification

- 精简 `docs/plans/p1p2-integration-check.md`，压缩已确认 PASS 内容
- 新增真实 LLM 集成测试章节（DeepSeek API key + 响应灵活性）

## 2. TDD Mapping（先测前提）

文档类任务，无代码实现，无 TDD 映射。

## 3. Red（先写失败测试）

N/A — 文档类任务。

## 4. Green（最小实现通过）

- [x] 压缩已确认 PASS 的 6 大项为 §0 单表汇总
- [x] 移除所有已确认项的 grep 命令和详细分析
- [x] 新增 §3 真实 LLM 集成测试章节
- [x] 重组剩余章节，文档从 533 行压缩至 183 行

## 5. Refactor（保持绿灯）

N/A — 文档类任务。

## 6. Evidence

- RUN_LOG: `openspec/_ops/task_runs/ISSUE-507.md`
- 文档: `docs/plans/p1p2-integration-check.md`
