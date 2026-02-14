# 提案：s0-context-observe

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint0（A2-H-001）指出：`skillExecutor.ts` 在 context 组装异常时使用空 `catch {}` 吞错，仅保留注释“best-effort”，导致真实故障不可观测。当前行为违背“Fail loud, not silent”的治理要求，故障发生后缺乏定位信号。

## 变更内容

- 将 context 组装异常路径从“静默吞错”升级为“降级但可观测（记录结构化 warning）”。
- 结构化 warning 至少包含 `executionId`、`skillId`、`error` 字段，便于跨日志检索。
- 保持技能执行主流程不中断，确保降级策略仍为 best-effort。

## 受影响模块

- Skill System（`apps/desktop/main/src/services/skills/skillExecutor.ts`）— 异常观测性增强。
- Skill System 测试（`apps/desktop/main/src/services/skills/__tests__/skillExecutor.test.ts`）— 新增 warning 结构断言。

## 依赖关系

- 上游依赖：无（Sprint0 并行组 C，独立项）。
- 横向关注：日志注入路径需与现有 `SkillExecutor` 依赖注入方式一致，不新增全局单例。

## Dependency Sync Check

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint0 `s0-context-observe` 条目；
  - `openspec/specs/skill-system/spec.md` 中“技能执行失败错误处理”与“可取消执行”约束。
- 核对项：
  - 降级策略：context 失败时技能执行不中断；
  - 可观测性：必须记录结构化 warning，而非空 `catch`；
  - 测试映射：Scenario 与 `skillExecutor` 测试用例一一对应。
- 结论：`NO_DRIFT`（符合 Sprint0 止血目标，可进入后续 TDD 实施）。

## 不做什么

- 不改动 Context Engine 的组装算法与上下文分层策略。
- 不引入新的错误码体系或 UI 交互提示。
- 不改变技能成功/失败 envelope，仅补齐 warning 观测信号。

## 审阅状态

- Owner 审阅：`PENDING`
