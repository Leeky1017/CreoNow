# Proposal: issue-532-s1-openspec-changes-bootstrap

## Why

需要将 `docs/plans/unified-roadmap.md` 的 Sprint 1 十个 change 一次性落为可执行的 OpenSpec 工件，并且把 `docs/代码问题/` 的防复发标签显式写入每个 change，避免后续执行阶段重复踩坑（静默失败、安全校验缺失、单体回归、伪测试等）。

## What Changes

- 新建 10 个 active changes（每个包含 `proposal.md`、`tasks.md`、`specs/*-delta.md`）：
  - `s1-break-context-cycle`
  - `s1-ipc-acl`
  - `s1-path-alias`
  - `s1-break-panel-cycle`
  - `s1-runtime-config`
  - `s1-doc-service-extract`
  - `s1-ai-service-extract`
  - `s1-kg-service-extract`
  - `s1-context-ipc-split`
  - `s1-scheduler-error-ctx`
- 每个 change 对齐 S0 归档模板，统一包含：
  - `依赖同步检查（Dependency Sync Check）`
  - TDD 六段结构（Specification → TDD Mapping → Red → Green → Refactor → Evidence）
  - 踩坑提醒与防治标签
- 更新 `openspec/changes/EXECUTION_ORDER.md` 为 Sprint 1 Wave 执行拓扑。

## Impact

- Affected specs:
  - `openspec/changes/s1-*/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - 文档层面改动，无运行时代码改动
- Breaking change: NO
- User benefit: 后续 S1 执行者可直接按 change 文档进入 TDD，且有标签化防复发指引
