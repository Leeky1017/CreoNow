> 本文件是 backend-design 的一部分，完整索引见 [docs/references/backend-design/README.md](README.md)

# 七、多 Agent 协作与质量评判

---

## 7.1 Writer + Reviewer 双 Agent 模式（计划实现；当前 Post-Writing Hook 仅含 cost-tracking 和 auto-save-version **stub**）

设计目标：

- Writer Agent：负责写作（续写、改写、润色）
- Reviewer Agent：负责检查（是否与 KG 矛盾、是否符合角色设定、是否有逻辑漏洞）
- Writer 写完 -> Reviewer 自动检查 -> 有问题则标记（不自动修改，让用户决定）
- 本质上是 Post-Writing Hook 链的一部分（INV-8）

> **已部分实现**：Post-Writing Hook 框架存在于 `apps/desktop/main/src/services/skills/orchestrator.ts`（hook 注册 + 调用）；当前 hook 仅包含 cost-tracking（`services/ai/costTracker.ts`）和 auto-save-version stub。独立的 Reviewer Agent 逻辑为计划实现。

## 7.2 Judge（质量评判）

AI 写完后，另一个 LLM 调用给写作质量打分。评分维度：

- 是否符合已有的角色性格和行为模式
- 是否与 KG 中的已有事实矛盾
- 文风是否与用户偏好一致

> **已实现位置**：Judge 服务已部分实现于 `apps/desktop/main/src/services/judge/judgeService.ts`（含测试 `judgeService.test.ts` 和 `judgeService-coverage.test.ts`）。高级评判运行器见 `services/ai/judgeAdvancedRunner.ts`；质量评分服务见 `services/ai/judgeQualityService.ts`。IPC 入口见 `ipc/judge.ts`。

优先级：P3。简单的 Reviewer 在 P2 即可落地。
