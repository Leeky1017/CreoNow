# 提案：aud-c3b-ipc-assert-project-access

## 背景

敏感 IPC 统一 assertProjectAccess。当前系统在该点存在已审计风险，若不修复会持续扩大到稳定性、正确性与可治理性问题。

## 变更内容

- chat/contextFs/knowledge/memory 全链路接入鉴权守卫
- 建立可回归验证的最小闭环（Specification → TDD Mapping → Red → Green → Refactor）
- 输出可审计证据并纳入 RUN_LOG

## 受影响模块

- ipc - 主要行为契约与验证路径

## 不做什么

- 不在本 change 内处理无直接因果关系的其它审计项
- 不跨越既定依赖顺序提前实现下游能力

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
