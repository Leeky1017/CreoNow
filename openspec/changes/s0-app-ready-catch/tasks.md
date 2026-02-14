## 1. Specification

- [ ] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s0-app-ready-catch（A6-H-002）` 的问题定义与操作边界
- [ ] 1.2 审阅 `apps/desktop/main/src/index.ts` 的 `app.whenReady().then(...)` 启动链路，确认当前缺失链尾兜底
- [ ] 1.3 审阅/补充 `openspec/changes/s0-app-ready-catch/specs/workbench-delta.md`，确保 Requirement 与 Scenario 可测试化
- [ ] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 对上游活跃 change 结论为 N/A
- [ ] 1.5 标注同文件协同约束：与 `s0-window-load-catch` 并行改 `index.ts` 时保持启动链路一致且不相互覆盖

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 每个 Scenario 映射为至少一个失败测试，覆盖 `index.ts` 启动链路关键分支
- [ ] 2.2 为测试用例标注 Scenario ID（S0-ARC-1/2/3），建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.4 明确 `index.ts` 启动链路测试名并写入 RUN_LOG

### Scenario → 测试映射

| Scenario ID | 测试文件                                        | `index.ts` 启动链路相关测试名                                              | 断言要点                                                                              |
| ----------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| S0-ARC-1    | `apps/desktop/main/src/__tests__/index.test.ts` | `appReady chain rejection logs app_init_fatal and quits app`               | `whenReady().then(...)` 链中任一点 reject 时，记录 `app_init_fatal` 并调用 `app.quit` |
| S0-ARC-2    | `apps/desktop/main/src/__tests__/index.test.ts` | `appReady success path does not quit app`                                  | 初始化链正常完成时不触发 `app.quit`                                                   |
| S0-ARC-3    | `apps/desktop/main/src/__tests__/index.test.ts` | `appReady startup chain is catch-terminated (no unhandled rejection leak)` | Promise 链具备链尾 `.catch`，异常被收敛且无未处理拒绝泄漏                             |

## 3. Red（先写失败测试）

- [ ] 3.1 在 `apps/desktop/main/src/__tests__/index.test.ts` 编写 S0-ARC-1 失败测试：mock 初始化步骤 reject，断言日志与退出动作
- [ ] 3.2 编写 S0-ARC-2 失败测试：成功启动链路不应触发 `app.quit`
- [ ] 3.3 编写 S0-ARC-3 失败测试：验证链尾兜底前置条件（当前实现应先 Red）
- [ ] 3.4 运行 `pnpm exec vitest run apps/desktop/main/src/__tests__/index.test.ts`，记录 Red 证据

## 4. Green（最小实现通过）

- [ ] 4.1 在 `index.ts` 的 `app.whenReady().then(...)` 链尾追加 `.catch((err) => { logger.error("app_init_fatal", ...); app.quit(); })`
- [ ] 4.2 移除 `void` 前缀，确保启动链路不再是无兜底 fire-and-forget
- [ ] 4.3 仅做让 Red 变绿的最小改动，不引入额外初始化分支改造
- [ ] 4.4 复跑测试确认全部 Green

## 5. Refactor（保持绿灯）

- [ ] 5.1 统一 `app_init_fatal` 日志字段（`error`/`stack`）与其他启动日志风格
- [ ] 5.2 与 `s0-window-load-catch` 联合检查同文件改动顺序，确保 `index.ts` 启动链路可读且冲突最小
- [ ] 5.3 执行启动路径回归（至少 `index.test.ts` + 必要 smoke），确认保持绿灯

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Red/Green 命令、关键输出与结论
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（N/A 或无漂移/已更新）
- [ ] 6.3 记录与 `s0-window-load-catch` 的同文件协同结论（同 PR/冲突处理策略/最终一致性）
