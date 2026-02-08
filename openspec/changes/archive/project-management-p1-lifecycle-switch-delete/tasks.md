## 1. Specification

- [x] 1.1 审阅并确认 PM-2 仅覆盖多项目切换、项目删除、生命周期闭环
- [x] 1.2 审阅并确认 PM-2 依赖 PM-1 合并后才可进入实现
- [x] 1.3 审阅并确认跨切异常覆盖（并发冲突/权限不足/数据库写失败）与 NFR 基线要求
- [x] 1.4 在进入 Red 前完成依赖同步检查（Dependency Sync Check）：核对 PM-1 已合并产出的数据模型/IPC 契约/错误码与本 change 假设

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] PM2-S1 切换项目前先保存当前未落盘内容
  - 目标测试：`apps/desktop/tests/integration/project-switch.autosave.test.ts`
  - 用例：`should flush pending autosave before switching project context`
- [x] PM2-S2 切换超过 1 秒显示加载指示并在完成后消失
  - 目标测试：`apps/desktop/renderer/src/features/projects/ProjectSwitcher.loading-bar.test.tsx`
  - 用例：`should show top progress bar after 1s timeout and hide on completion`
- [x] PM2-S3 名称匹配后确认删除项目
  - 目标测试：`apps/desktop/renderer/src/features/projects/DeleteProjectDialog.confirmation.test.tsx`
  - 用例：`should enable delete only when typed project name matches exactly`
- [x] PM2-S4 名称不匹配时删除被阻断
  - 目标测试：`apps/desktop/renderer/src/features/projects/DeleteProjectDialog.confirmation.test.tsx`
  - 用例：`should keep delete disabled and skip ipc request on mismatch`
- [x] PM2-S5 归档后恢复并保持项目统计一致
  - 目标测试：`apps/desktop/tests/integration/project-lifecycle.state-machine.test.ts`
  - 用例：`should transition active->archived->active and preserve stats`
- [x] PM2-S6 活跃项目直接永久删除被阻断
  - 目标测试：`apps/desktop/tests/unit/projectLifecycle.guard.test.ts`
  - 用例：`should reject active->deleted transition with PROJECT_DELETE_REQUIRES_ARCHIVE`
- [x] PM2-S7 两窗口并发删除同一项目的幂等冲突处理
  - 目标测试：`apps/desktop/tests/integration/project-purge.concurrent.test.ts`
  - 用例：`should return NOT_FOUND for second purge request without side effects`
- [x] PM2-S8 文件系统权限不足时阻断 purge
  - 目标测试：`apps/desktop/tests/integration/project-purge.permission.test.ts`
  - 用例：`should keep archived status when purge path has no write permission`
- [x] PM2-S9 数据库写入失败时返回结构化错误码
  - 目标测试：`apps/desktop/tests/unit/projectLifecycle.persistence-failure.test.ts`
  - 用例：`should return PROJECT_LIFECYCLE_WRITE_FAILED when db write fails`
- [x] PM2-S10 切换与生命周期阈值建立 benchmark 基线
  - 目标测试：`apps/desktop/tests/perf/project-lifecycle.benchmark.test.ts`
  - 用例：`should assert switch/archive/restore/purge latency baseline thresholds`

## 3. Red（先写失败测试）

- [x] 3.1 先为 PM2-S1~PM2-S2 编写失败测试并确认 Red（切换与超时可视反馈）
- [x] 3.2 再为 PM2-S3~PM2-S6 编写失败测试并确认 Red（删除确认与状态机约束）
- [x] 3.3 最后为 PM2-S7~PM2-S10 编写失败测试并确认 Red（并发/权限/IO/NFR）
- [x] 3.4 将 Red 失败日志与命令输出记录到 `openspec/_ops/task_runs/ISSUE-307.md`

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 PM2-S1~PM2-S2 通过的最小代码
- [x] 4.2 仅实现让 PM2-S3~PM2-S6 通过的最小代码
- [x] 4.3 仅实现让 PM2-S7~PM2-S10 通过的最小代码
- [x] 4.4 记录 Green 通过证据（集成/组件/基线测试）到 RUN_LOG

## 5. Refactor（保持绿灯）

- [x] 5.1 将生命周期 transition map 与 guard 抽离为可测试状态机模块
- [x] 5.2 保持 `project:project:switch`、`project:lifecycle:{archive|restore|purge|get}` 外部契约稳定

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（Scenario 映射、Red/Green 证据、关键命令输出）
- [x] 6.2 记录 benchmark 基线结果与阈值判断证据
- [x] 6.3 记录门禁、Rulebook 校验与 PR 合并证据
- [x] 6.4 记录 Dependency Sync Check 的输入、结论（无漂移/已更新）与后续动作
