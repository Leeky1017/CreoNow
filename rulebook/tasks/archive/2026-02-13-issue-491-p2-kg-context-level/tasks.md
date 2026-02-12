## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #491 + `task/491-p2-kg-context-level` worktree
- [x] 1.2 Rulebook task 创建并 `validate` 通过
- [x] 1.3 Specification：核对主 spec + change delta + Dependency Sync Check（C8 无上游依赖，结论 N/A）
- [x] 1.4 Red：完成 S1-S4 失败测试证据（默认值/更新/过滤/非法值）
- [x] 1.5 Green：落地 `aiContextLevel` 类型、校验、DB 列、查询过滤、行映射
- [x] 1.6 Refactor：统一 `AiContextLevel` 导出与校验复用，保持行为不漂移

## 2. Testing

- [x] 2.1 运行目标测试：`pnpm exec tsx apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [x] 2.7 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-491.md`（准入、Red/Green、门禁、合并证据）
- [x] 3.2 完成并归档 `openspec/changes/p2-kg-context-level`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 PR auto-merge 后归档 `rulebook/tasks/issue-491-p2-kg-context-level`
