## 1. Specification

- [x] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s0-window-load-catch（A6-H-001）` 的问题定义与验收边界
- [x] 1.2 审阅 `apps/desktop/main/src/index.ts` 中主窗口创建与 `loadURL/loadFile` 分支，确认仅覆盖窗口加载失败路径
- [x] 1.3 审阅/补充 `openspec/changes/s0-window-load-catch/specs/workbench-delta.md`，确认 Requirement 与 Scenario 可直接映射测试
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 对上游活跃 change 结论为 N/A
- [x] 1.5 记录同文件协同约束：`index.ts` 与 `s0-app-ready-catch` 并行修改时保持同一启动链路语义一致，不互相覆盖

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 每个 Scenario 映射为至少一个失败测试，且全部落在 `index.ts` 启动链路相关测试
- [x] 2.2 为测试用例标注 Scenario ID（S0-WLC-1/2/3），建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.4 明确 `index.ts` 启动链路测试名并写入 RUN_LOG

### Scenario → 测试映射

| Scenario ID | 测试文件                                                 | `index.ts` 启动链路相关测试名                                         | 断言要点                                                          |
| ----------- | -------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| S0-WLC-1    | `apps/desktop/tests/unit/main/window-load-catch.test.ts` | `createMainWindow logs window_load_failed when loadURL rejects`       | `loadURL` reject 后记录 `logger.error("window_load_failed", ...)` |
| S0-WLC-2    | `apps/desktop/tests/unit/main/window-load-catch.test.ts` | `createMainWindow logs window_load_failed when loadFile rejects`      | `loadFile` reject 后记录同名错误事件                              |
| S0-WLC-3    | `apps/desktop/tests/unit/main/window-load-catch.test.ts` | `createMainWindow does not log window_load_failed when load succeeds` | Promise resolve 时不产生误报错误日志                              |

## 3. Red（先写失败测试）

- [x] 3.1 在 `apps/desktop/tests/unit/main/window-load-catch.test.ts` 编写 S0-WLC-1 失败测试：mock `loadURL` reject，先看到断言失败
- [x] 3.2 编写 S0-WLC-2 失败测试：mock `loadFile` reject，先看到断言失败
- [x] 3.3 编写 S0-WLC-3 失败测试：成功分支不应误报错误日志
- [x] 3.4 运行 `pnpm -C apps/desktop exec vitest run --config tests/unit/main/vitest.window-load.config.ts`，记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 在 `index.ts` dev 分支将 `win.loadURL(...)` 改为链式 `.catch((err) => logger.error("window_load_failed", ...))`
- [x] 4.2 在 `index.ts` prod 分支将 `win.loadFile(...)` 改为同等 `.catch(...)` 处理，保持日志字段一致
- [x] 4.3 仅做让 Red 转绿的最小改动，不引入窗口加载重试或 UI 降级逻辑
- [x] 4.4 复跑上述测试，确认全部 Green

## 5. Refactor（保持绿灯）

- [x] 5.1 抽查 `index.ts` 日志字段命名一致性（事件名、错误文本、目标路径/URL）
- [x] 5.2 与 `s0-app-ready-catch` 协同审查同文件改动，确保链路可读性和最小冲突
- [x] 5.3 执行启动相关回归（至少 `index.test.ts` + 必要启动 smoke），确认保持绿灯

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 命令、关键输出与结论
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（N/A 或无漂移/已更新）
- [x] 6.3 记录与 `s0-app-ready-catch` 的同文件协同结论（同 PR/冲突处理策略/最终一致性）
