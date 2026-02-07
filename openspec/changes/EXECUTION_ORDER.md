# Active Changes Execution Order

更新时间：2026-02-07 23:07

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 3，采用**串行执行**。
- 原则：有依赖关系的 change 必须串行；仅当依赖矩阵明确“无共享前置”时才允许并行。

## 执行顺序

1. `ipc-p0-contract-ssot-and-codegen`
2. `ipc-p0-runtime-validation-and-error-envelope`
3. `ipc-p0-preload-gateway-and-security-baseline`

## 依赖说明

- `ipc-p0-runtime-validation-and-error-envelope` 依赖 `ipc-p0-contract-ssot-and-codegen` 的契约注册表与 codegen 基线。
- `ipc-p0-preload-gateway-and-security-baseline` 依赖前两项产出的通道/错误码契约稳定后再收敛网关与安全边界。

## 执行清单（每个 change 必做）

1. 完成 `Specification` 审阅
2. 完成 `TDD Mapping`（Scenario→测试映射）
3. 执行 `Red`（记录失败证据）
4. 执行 `Green`（最小实现）
5. 执行 `Refactor`（保持绿灯）
6. 更新 `Evidence` 与 RUN_LOG

## 维护规则

- 当新增/删除活跃 change，或任一 change 的依赖、范围、状态变化时，必须同步更新本文件。
- 未更新本文件时，不得宣称“执行顺序已确认”。
