# 提案：s2-memory-injection

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（AR-C13）定义了该 change：Memory preview 需要注入 AI prompt，并通过 `getPreviewInjection(projectId)` 接入 settings fetcher。若未接入，记忆系统对上下文组装不可见，无法体现用户偏好。

## 变更内容

- 在 memory 服务补齐 `getPreviewInjection(projectId)` 读取接口。
- 在 settings fetcher 接入 memory preview 注入链路。
- 增加“有记忆注入 prompt”测试，并补齐 context 组装端到端验证。

## 受影响模块

- Memory System：`apps/desktop/main/src/services/memory/memoryService.ts`
- Context Engine：`apps/desktop/main/src/services/context/fetchers/settingsFetcher.ts`
- Memory 测试：`apps/desktop/main/src/services/memory/__tests__/`

## 依赖关系

- 上游依赖：Phase 1 C2（roadmap 标注）。
- 并行关系：独立于 Phase 2 其他项，可并行推进。
- 下游影响：为后续 context 组装稳定提供记忆输入。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：Phase 2 依赖图（`s2-memory-injection` 依赖 Phase 1 C2）与 C13 条目范围。
- 核对项：memory preview 读取、settings fetcher 注入、E2E 验证均在路线图定义范围内。
- 结论：`NO_DRIFT`（当前草案与路线图一致）。

## 踩坑提醒（防复发）

- 记忆读取异常不得静默吞错，必须输出可追踪降级信息（防 `SILENT`）。
- 仅做 preview 注入链路，不混入额外记忆策略改造。
- 先完成 Red 失败证据再实现，避免 `FAKETEST`。

## 防治标签

- `FAKETEST`
- `SILENT`

## 不做什么

- 不扩展记忆蒸馏、衰减或清理策略。
- 不改动 Sprint 2 之外的 memory/context 契约。
- 不引入与本 change 无关的 UI 范围变更。

## 审阅状态

- Owner 审阅：`PENDING`
