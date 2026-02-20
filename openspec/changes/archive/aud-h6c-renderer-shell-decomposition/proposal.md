# 提案：aud-h6c-renderer-shell-decomposition

## 背景

Wave2 已完成主进程 service 基线拆分（H6A），但 Renderer 仍存在超大组件（如 `AppShell` / `AiPanel`）导致的风险：

- 纯逻辑混杂在 UI 组件内部，缺少独立、确定性的回归门禁，容易发生 silent drift。
- 组件体积过大，审计整改与后续维护成本高，变更难以隔离。

本 change 在 Wave3 范围内要求将“可纯函数化且可独立回归”的逻辑抽取为 helper 模块，保持对外行为语义不变，同时提供可追踪的测试证据。

## 变更内容

- 从 `AppShell` 抽取 layout/zen-mode 内容提取等纯逻辑为 `appShellLayoutHelpers`，并建立定向回归测试。
- 从 `AiPanel` 抽取格式化/样式映射等纯逻辑为 `aiPanelFormatting`，并建立定向回归测试。
- 在 delta spec 中补齐可验证 Scenario（含 Scenario ID），并在 `tasks.md` 中建立 Scenario -> Test 映射与证据指针。

## 受影响模块

- workbench - 主要行为契约与验证路径

## 不做什么

- 不在本 change 内处理无直接因果关系的其它审计项
- 不跨越既定依赖顺序提前实现下游能力
- 不新增用户可见功能或引入新的 IPC 契约（仅重组内部实现并加固回归门禁）

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
