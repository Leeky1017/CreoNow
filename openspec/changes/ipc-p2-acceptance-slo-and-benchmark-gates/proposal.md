# 提案：ipc-p2-acceptance-slo-and-benchmark-gates

## 背景

IPC 主 spec 已定义量化阈值（延迟、校验耗时、失败处理），但当前缺少与阈值直接绑定的可执行验收套件与门禁。这导致“达标”只能依赖人工判断，无法形成稳定的回归保护。

## 变更内容

- 将 **模块级可验收标准**落为可执行的 acceptance 基准测试套件。
- 建立指标采样、分位计算和结果报告格式，确保 p95/p99 判断可复现。
- 将阈值违反作为可判定门禁结果输出，支持 CI 阻断与问题定位。

## 受影响模块

- IPC — `openspec/specs/ipc/spec.md`（delta）
- Performance tests — `apps/desktop/tests/perf/`
- CI workflow — `.github/workflows/`
- RUN_LOG evidence — `openspec/_ops/task_runs/`

## 不做什么

- 不调整 Owner 已固定的阈值与错误码字典。
- 不在本 change 内扩展新的 IPC 功能通道。

## 审阅状态

- Owner 审阅：`APPROVED`（2026-02-08）
