# 提案：version-control-p4-save-contract-drift-fix

## 背景

在 `#425/#428` 合并后，CI `windows-e2e` 出现保存链路失败。根因是 `DocumentService.save()` 已返回可选 `compaction`，但 IPC 契约 `file:document:save` 响应未声明该字段，导致 runtime validation 将其判定为 extra field 并拒绝响应。

## 变更内容

- 为 `file:document:save` 响应 schema 补充可选 `compaction` 字段（与 snapshot compaction 结构一致）
- 补充契约回归测试，确保后续不会再次出现 save 响应字段漂移
- 同步生成 `packages/shared/types/ipc-generated.ts`

## 受影响模块

- IPC — `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Shared Types — `packages/shared/types/ipc-generated.ts`
- Unit Tests — `apps/desktop/tests/unit/document-ipc-contract.test.ts`

## 不做什么

- 不变更 `DocumentService.save()` 的业务行为
- 不调整 snapshot compaction 触发策略和阈值
- 不扩展新的版本控制功能

## 审阅状态

- Owner 审阅：`PENDING`
