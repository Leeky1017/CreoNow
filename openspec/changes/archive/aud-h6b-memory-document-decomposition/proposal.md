# 提案：aud-h6b-memory-document-decomposition

## 背景

Wave2 已完成主进程 service 基线拆分（H6A），但 memory/document 仍存在「超大文件 + 内部纯逻辑难以单测/回归」问题：helper 逻辑与服务编排耦合在一起，导致审计整改难以形成稳定、可追踪的回归闭环。

本 change 在 Wave3 范围内要求将关键纯函数逻辑沉降为可测试 helper 模块，在不改变外部行为语义的前提下，降低服务复杂度并建立可回归证据。

## 变更内容

- 将 `episodicMemoryService` 的纯逻辑拆分为 `episodicMemoryHelpers`，并为 helper 行为建立独立回归测试（确定性、无外部依赖）。
- 将文档 diff 计算逻辑拆分为 `documentDiffHelpers`，并为 hunk 计算 / unified diff 输出建立回归测试。
- 在 delta spec 中补齐可验证 Scenario（含 Scenario ID），并在 `tasks.md` 中建立 Scenario -> Test 映射与证据指针。

## 受影响模块

- memory-system - episodic memory helper 拆分与行为契约
- document-management - document diff helper 拆分与行为契约

## 不做什么

- 不在本 change 内处理无直接因果关系的其它审计项
- 不跨越既定依赖顺序提前实现下游能力
- 不引入新的对外 IPC 契约或新增用户可见功能（仅重组内部实现并增加可回归门禁）

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
