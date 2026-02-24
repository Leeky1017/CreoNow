# Project Management Specification Delta

更新时间：2026-02-23 23:54

## Change: issue-617-scoped-lifecycle-and-abort

### Requirement: 项目切换必须触发 ProjectLifecycle 的解绑/绑定与资源清理 [ADDED]

项目切换**必须**具备可验证的资源生命周期闭环，确保跨项目操作不会引入内存泄漏、文件句柄泄漏或残留后台任务。

- 切换流程必须遵循：`unbind ALL → 持久化切换 → bind ALL`。
- 解绑/绑定应有超时保护，单个服务失败不得导致系统静默卡死。
- ProjectLifecycle 仅负责“统一触发 unbind/bind 与顺序约束”；各模块的资源清理语义由对应模块 delta spec 定义并可回归验证：
  - IPC timeout -> abort：见 `specs/ipc/spec.md`（Scenario: BE-SLA-S2）
  - session 并发槽位回收：见 `specs/skill-system/spec.md`（Scenario: BE-SLA-S3）
  - project-scoped cache/watcher 清理：见 `specs/context-engine/spec.md`（Scenario: BE-SLA-S4）

#### Scenario: BE-SLA-S1 项目切换先解绑再绑定且具备超时保护 [ADDED]

- **假设** 当前项目为 A，目标项目为 B
- **当** 系统执行项目切换
- **则** 系统先对所有 project-scoped 服务执行 A 的 unbind，再执行持久化切换，再执行 B 的 bind
- **并且** 任一解绑/绑定步骤具备超时保护
