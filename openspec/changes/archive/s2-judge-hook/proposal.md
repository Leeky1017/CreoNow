# 提案：s2-judge-hook

## 背景

`docs/plans/unified-roadmap.md` 将 `s2-judge-hook` 定义为 Sprint 2 债务修复项（A1-H-003）。当前 `judge:model:ensure` 状态机逻辑存在重复实现风险，导致不同调用点在 busy/downloading/error 语义上可能漂移，增加维护复杂度。

## 变更内容

- 引入并统一使用 `useJudgeEnsure` 共享 hook 承载 `judge:model:ensure` 状态机。
- 约束调用点复用同一状态机输出，避免页面级重复拼装状态。
- 补齐状态流转验证用例，覆盖成功、失败、进行中三类路径。

## 受影响模块

- Workbench（Settings）— `apps/desktop/renderer/src/features/settings/JudgeSection.tsx`
- Workbench（Hooks）— `apps/desktop/renderer/src/hooks/useJudgeEnsure.ts`
- 其他 `judge:model:ensure` 消费点（同一状态机收敛）

## 依赖关系

- 上游依赖：无（Sprint 2 债务组默认独立并行）。
- 横向协同：与 judge 相关功能可并行，收敛边界限于状态机复用。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s2-judge-hook` 条目；
  - `openspec/specs/workbench/spec.md` 的设置与状态呈现规范。
- 核对项：
  - `judge:model:ensure` 状态机语义统一；
  - 至少两处调用点复用同一 hook；
  - 不扩展业务能力，仅消除重复实现。
- 结论：`NO_DRIFT`。

## 踩坑提醒（防复发）

- 避免在调用点重新维护局部状态机副本，必须以共享 hook 为唯一状态源。

## 防治标签

- `DUP` `OVERABS` `FAKETEST`

## 不做什么

- 不新增 judge 模型下载能力或配置项。
- 不改 UI 视觉规范与文案体系。
- 不修改主 spec 正文（仅起草 change 三件套）。

## 审阅状态

- Owner 审阅：`PENDING`
