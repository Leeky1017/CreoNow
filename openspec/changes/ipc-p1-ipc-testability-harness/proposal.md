# 提案：ipc-p1-ipc-testability-harness

## 背景

IPC 已具备契约、校验和安全基线，但“可测试性”尚未形成统一工程能力：测试 helper 分散、mock 方式不一致、场景与测试映射不可自动核验。继续扩展 IPC 功能会显著放大回归风险与测试维护成本。

## 变更内容

- 将 **可测试性**落为统一的 IPC 测试基建（main/preload/push 三类 helper + 固定夹具）。
- 明确“无真实 Electron 运行时依赖”的单元测试约束，保障本地与 CI 可重复。
- 增加 Scenario→测试映射的可校验清单，防止 spec 场景被遗漏。

## 受影响模块

- IPC — `openspec/specs/ipc/spec.md`（delta）
- Unit test helpers — `apps/desktop/tests/helpers/ipc/`
- Unit tests — `apps/desktop/tests/unit/`
- QA script — `scripts/`

## 不做什么

- 不引入真实 LLM、真实网络或真实 Electron E2E 作为本 change 的通过前提。
- 不定义性能阈值门禁（由后续 acceptance change 处理）。

## 审阅状态

- Owner 审阅：`APPROVED`（2026-02-08）
