## 1. Implementation

- [x] 1.1 新增并归档 `document-management-p2-hardening-and-gates` 的 proposal/tasks/spec（OpenSpec-only）
- [x] 1.2 确认 requirement 数量 <= 3 且显式覆盖容量/编码/并发/性能/背压/路径越权
- [x] 1.3 保持主 spec 不变，仅改动 delta spec 与治理文档

## 2. Testing

- [x] 2.1 建立完整 Scenario -> 测试映射，包含全部边界/异常场景
- [x] 2.2 执行交付 preflight，确保 Rulebook/OpenSpec/Issue 状态满足门禁
- [x] 2.3 记录证据命令输出（diff 与文档结构检查）到 RUN_LOG

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/EXECUTION_ORDER.md`（归档状态与更新时间）
- [x] 3.2 创建并维护 `openspec/_ops/task_runs/ISSUE-289.md`（关键命令与输出）
- [x] 3.3 完成 PR + auto-merge + 控制面 `main` 同步后归档 Rulebook task
