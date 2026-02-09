# 提案：issue-326-layer2-layer3-integration-gate

## 背景

Layer2（Document Management）与 Layer3（Knowledge Graph / Project Management / Memory System）已分别完成开发与测试，但缺少里程碑级集成门禁闭环：尚未统一执行一次跨模块全量检查，也没有形成可追踪的 delta report。当前主要风险不是单模块缺功能，而是跨模块契约出现“规范与实现漂移”后仍被误判为已完成。

## 变更内容

- 新增一次 Layer2+Layer3 里程碑集成检查的规范化交付：
  - 全量门禁测试结果落盘；
  - `cross-module-integration-spec` 与 IPC 契约 SSOT 逐条核对；
  - 输出 implemented / partial / missing 的 delta report。
- 在 delta spec 中显式记录本次发现的跨模块漂移（通道命名、响应 envelope、错误码基线、导出通道）并要求后续收敛动作。
- 将本次检查证据写入 `openspec/_ops/task_runs/ISSUE-326.md`，避免 silent pass。

## 受影响模块

- Cross Module Integration Spec — `openspec/specs/cross-module-integration-spec.md`（通过 delta 描述，不直接改主 spec）
- IPC Contract Baseline — `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Generated IPC Types — `packages/shared/types/ipc-generated.ts`
- Rulebook 任务 — `rulebook/tasks/issue-326-layer2-layer3-integration-gate/`

## 不做什么

- 不在本 change 中改动运行时代码、IPC handler 或数据库结构。
- 不直接修改 `openspec/specs/**` 主规范。
- 不在本 change 中引入新的功能需求；仅完成里程碑集成门禁与差异落盘。

## 审阅状态

- Owner 审阅：`PENDING`
