## 1. Implementation

- [x] 1.1 准入：OPEN Issue #406、`task/406-skill-system-p2-custom-skill-crud` worktree、Rulebook task 创建并 validate 通过
- [x] 1.2 Dependency Sync Check：核对上游 `skill-system-p1` 与 `ai-service-p3` 的数据结构、IPC 契约与错误码语义
- [x] 1.3 主进程实现自定义技能 CRUD（service + IPC + SQLite migration）
- [x] 1.4 渲染层实现技能管理界面（手动创建、AI 辅助草稿、编辑、删除确认、字段内联错误）
- [x] 1.5 执行链路对齐：自定义技能加入 registry，并支持 `inputType` 驱动的输入策略

## 2. Testing

- [x] 2.1 Red：记录目标场景失败证据（custom create/list、validation、delete confirm）
- [x] 2.2 Green：新增/更新测试通过
- [x] 2.3 Fresh gate：`pnpm typecheck`
- [x] 2.4 Fresh gate：`pnpm lint`
- [x] 2.5 Fresh gate：`pnpm contract:generate && pnpm contract:check`
- [x] 2.6 Fresh gate：`pnpm cross-module:check`
- [x] 2.7 Fresh gate：`pnpm test:unit`
- [x] 2.8 Fresh gate：`pnpm -C apps/desktop test:run`
- [ ] 2.9 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-406.md`（Dependency Sync Check + Red/Green + 门禁证据）
- [x] 3.2 归档 `openspec/changes/skill-system-p2-custom-skill-crud` 并更新 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 同 PR 自归档 `rulebook/tasks/issue-406-skill-system-p2-custom-skill-crud`
