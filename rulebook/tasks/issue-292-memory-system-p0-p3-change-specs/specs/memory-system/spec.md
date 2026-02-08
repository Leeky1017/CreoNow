# Memory System Task Spec — issue-292-memory-system-p0-p3-change-specs

## Scope
- Draft four serial OpenSpec changes for Memory System:
  1. `memory-system-p0-architecture-episodic-storage`
  2. `memory-system-p1-distillation-decay-conflict`
  3. `memory-system-p2-panel-provenance`
  4. `memory-system-p3-isolation-degradation`

## Acceptance
- 每个 change 目录必须包含：`proposal.md`、`specs/memory-system-delta.md`、`tasks.md`。
- `tasks.md` 必须按固定顺序包含 6 个章节：Specification / TDD Mapping / Red / Green / Refactor / Evidence。
- `openspec/changes/EXECUTION_ORDER.md` 必须包含执行模式、明确顺序、依赖关系、更新时间（YYYY-MM-DD HH:mm）。
- 四个 change 必须按依赖关系定义为严格串行：MS-1 -> MS-2 -> MS-3 -> MS-4。

## Cross-cut Matrix Coverage
- MS-1: 网络/IO 失败、容量溢出
- MS-2: 并发冲突、数据异常（置信度越界）
- MS-3: 数据异常（trace 失配）、权限/安全（跨项目读取）
- MS-4: 权限/安全（全量清除未确认）、网络/IO 失败（蒸馏调用失败导致降级）
