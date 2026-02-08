# Rulebook Delta: project-management（Issue-307）

## Scope

仅实现并交付以下活跃 change：

- `openspec/changes/project-management-p1-lifecycle-switch-delete`

## Requirements Coverage

- 多项目切换：
  - `project:project:switch` 前必须 flush pending autosave
  - 切换超过 1 秒显示顶部进度条并在完成后消失
  - 切换过程触发 KG/MS context hook（mock/no-op）
- 项目删除：
  - 删除前必须输入项目名二次确认
  - 名称不匹配不得触发删除 IPC
- 生命周期闭环：
  - 状态机固定 `active -> archived -> deleted`，支持 `archived -> active`
  - `active -> deleted` 被阻断并返回 `PROJECT_DELETE_REQUIRES_ARCHIVE`
  - 覆盖并发 purge 冲突、权限不足、数据库写入失败
- 基线阈值：
  - `switch` p95 < 1s，p99 < 2s
  - `archive` p95 < 600ms
  - `restore` p95 < 800ms
  - `purge` p95 < 2s（<=1000 文档规模）

## Delivery Guardrails

- Spec-first + Rulebook-first，主 spec 只读
- 先 Red 再 Green，禁止先写实现
- 关键命令与结论必须落盘 RUN_LOG
- 必须通过 `ci`、`openspec-log-guard`、`merge-serial` 并启用 auto-merge
- 最终收口到控制面 `main`
