# Spec Delta: document-management (ISSUE-289)

本任务对应 OpenSpec change `document-management-p2-hardening-and-gates`，目标是定义并收口 Document Management 的批次 4 硬化与门禁规范，不进入生产代码实现。

## Changes

- Add: 大文件、编码异常、并发编辑冲突、路径越权阻断的错误路径契约与错误码。
- Add: 模块级可验收阈值（容量、性能 p95、队列背压、路径安全）与可执行验证位。
- Add: 异常与边界覆盖矩阵，确保每类边界有 Scenario 绑定、错误码与恢复策略。
- Keep: 主 spec 不改，仅通过 archived delta spec 交付规范。

## Acceptance

- requirement 数量不超过 3 且覆盖 6 个硬边界点。
- `tasks.md` 固定六段顺序完整且包含 Scenario -> 测试映射。
- 交付经 preflight + required checks（`ci` / `openspec-log-guard` / `merge-serial`）并最终合并回 `main`。
