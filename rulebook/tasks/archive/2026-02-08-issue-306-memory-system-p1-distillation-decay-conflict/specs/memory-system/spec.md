# Memory System MS-2 Delivery Spec Snapshot

## Scope

Deliver `memory-system-p1-distillation-decay-conflict` only.

## Requirements Covered

- MS2-R1: 语义记忆蒸馏（batch/idle/manual/conflict）与进度推送
- MS2-R2: 衰减公式纯函数 + 生命周期分级 + 压缩流转
- MS2-R3: 冲突检测（时间迁移自动更新 + 直接矛盾进入用户队列）
- MS2-X: 并发蒸馏/写入隔离 + 置信度越界拒绝落库

## Scenario Mapping

- MS2-R1-S1 -> `apps/desktop/tests/integration/memory/distill-trigger-batch.test.ts`
- MS2-R1-S2 -> `apps/desktop/tests/unit/memory/distill-rule-generation.test.ts`
- MS2-R1-S3 -> `apps/desktop/tests/unit/memory/distill-llm-fallback.test.ts`
- MS2-R2-S1 -> `apps/desktop/tests/unit/memory/decay-lifecycle.test.ts`
- MS2-R2-S2 -> `apps/desktop/tests/unit/memory/decay-reactivation.test.ts`
- MS2-R2-S3 -> `apps/desktop/tests/unit/memory/decay-immune-confirmed-rule.test.ts`
- MS2-R3-S1 -> `apps/desktop/tests/unit/memory/conflict-time-shift.test.ts`
- MS2-R3-S2 -> `apps/desktop/tests/integration/memory/conflict-user-resolution-queue.test.ts`
- MS2-X-S1 -> `apps/desktop/tests/integration/memory/distill-write-concurrency.test.ts`
- MS2-X-S2 -> `apps/desktop/tests/unit/memory/confidence-validation.test.ts`
