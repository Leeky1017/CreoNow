# ISSUE-406

- Issue: #406
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/406
- Branch: task/406-skill-system-p2-custom-skill-crud
- PR: https://github.com/Leeky1017/CreoNow/pull/407
- Scope: 依据 `openspec/changes/skill-system-p2-custom-skill-crud` 完成交付：实现自定义技能手动创建、AI 辅助创建、编辑、删除、`skill:custom:*` IPC 契约与 SQLite 持久化，并合并回控制面 `main`。
- Out of Scope: 并发调度与队列（`skill-system-p3`）、技能市场/导入导出、Prompt 模板版本管理。

## Plan

- [x] 准入：Issue / worktree / Rulebook task
- [x] Specification：Dependency Sync Check（上游 `skill-system-p1` + `ai-service-p3`）
- [x] Red：失败测试与失败输出证据
- [x] Green：实现与场景映射测试通过
- [x] Fresh 门禁：typecheck/lint/contract/cross-module/test:unit/desktop tests
- [ ] preflight + PR auto-merge + main 收口 + change/rulebook 归档 + worktree 清理

## Runs

### 2026-02-10 22:41 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Skill System P2: custom skill CRUD delivery" --body-file -`
  - `scripts/agent_worktree_setup.sh 406 skill-system-p2-custom-skill-crud`
  - `rulebook task create issue-406-skill-system-p2-custom-skill-crud`
  - `rulebook task validate issue-406-skill-system-p2-custom-skill-crud`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/406`
  - 分支创建成功：`task/406-skill-system-p2-custom-skill-crud`
  - worktree 创建成功：`.worktrees/issue-406-skill-system-p2-custom-skill-crud`
  - Rulebook task validate 通过

### 2026-02-10 23:14 +0800 Dependency Sync Check（上游：skill-system-p1 + ai-service-p3）

- Input:
  - `openspec/specs/skill-system/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/specs/ai-service/spec.md`
  - `openspec/changes/archive/skill-system-p1-trigger-scope-management/specs/skill-system-delta.md`
  - `openspec/changes/archive/ai-service-p3-judge-quality-pipeline/specs/ai-service-delta.md`
  - `openspec/changes/skill-system-p2-custom-skill-crud/{proposal.md,tasks.md,specs/skill-system-delta.md}`
  - `apps/desktop/main/src/services/skills/skillService.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/ipc/skills.ts`
- Checkpoints:
  - 数据结构：自定义技能字段 `id/name/description/promptTemplate/inputType/contextRules/scope/enabled/createdAt/updatedAt` 与 delta spec 一致。
  - IPC 契约：已补齐 `skill:custom:create/update/delete/list` Request-Response 通道；`skill:registry:list` 可携带 custom 项供 SkillPicker 展示。
  - 错误码/错误信封：校验失败统一返回 `VALIDATION_ERROR`，并带 `details.fieldName` 供表单内联提示。
  - AI 辅助创建依赖：复用 `ai:chat:send` 输出 `echoed`，在 renderer 侧转为可编辑草稿，不新增跨模块强耦合。
- Conclusion: `NO_DRIFT`
- Follow-up:
  - 继续进入 Red/Green，并在 RUN_LOG 保留失败与通过证据。

### 2026-02-10 22:52 +0800 Red 失败证据（承接本分支已执行记录）

- Command:
  - `pnpm -C apps/desktop test:run src/features/ai/SkillManagerDialog.test.tsx apps/desktop/tests/unit/skill-scope-management.test.ts`
- Exit code: `1`
- Key output:
  - `skill:custom:create/list/delete` 相关 handler 与契约未实现导致断言失败。
  - `SkillManagerDialog` 缺失 AI 辅助生成、删除确认、字段内联错误显示导致用例失败。

### 2026-02-10 23:02 +0800 Green + Refactor（承接本分支已执行记录）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm -C apps/desktop test:run`
- Exit code: `0` / `0` / `0` / `0` / `0`
- Key output:
  - 自定义技能 CRUD（DB + IPC + service + renderer）链路可用。
  - 新增 UI 流程覆盖：手动创建、AI 辅助草稿、删除确认、字段内联错误。
  - `skill:registry:list` 纳入自定义技能，执行链路支持 custom `inputType`。

### 2026-02-10 23:20 +0800 Fresh 门禁验证（本轮）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:generate`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm -C apps/desktop test:run`
- Exit code: `0` / `0` / `0` / `1` / `0` / `0` / `0`
- Key output:
  - `typecheck` 通过：`tsc --noEmit`。
  - `lint` 通过：`eslint . --ext .ts,.tsx`。
  - `contract:check` 首次失败原因为：`packages/shared/types/ipc-generated.ts` 新增通道生成结果尚未入索引（命令本身为 `git diff --exit-code` 对比索引）。
  - `cross-module:check` 输出：`[CROSS_MODULE_GATE] PASS`。
  - `test:unit` 通过。
  - `apps/desktop` 全量 vitest 通过：`Test Files 102 passed`, `Tests 1266 passed`。

### 2026-02-10 23:21 +0800 Contract gate 修复（本轮）

- Command:
  - `git add packages/shared/types/ipc-generated.ts`
  - `pnpm contract:check`
- Exit code: `0`
- Key output:
  - `contract:check` 复跑通过（`pnpm contract:generate` 后 `ipc-generated.ts` 无额外差异）。

### 2026-02-10 23:23 +0800 Change/Rulebook 归档准备（本轮）

- Command:
  - `mv openspec/changes/skill-system-p2-custom-skill-crud openspec/changes/archive/`
  - 更新 `openspec/changes/EXECUTION_ORDER.md`
  - `rulebook task validate issue-406-skill-system-p2-custom-skill-crud`
  - `mv rulebook/tasks/issue-406-skill-system-p2-custom-skill-crud rulebook/tasks/archive/2026-02-10-issue-406-skill-system-p2-custom-skill-crud`
- Exit code: `0`
- Key output:
  - 活跃 change 已归档到 `openspec/changes/archive/skill-system-p2-custom-skill-crud`。
  - `EXECUTION_ORDER.md` 已同步为活跃 `8` 项，并调整 Skill System 泳道为 `p3 → p4`。
  - Rulebook task validate 通过，随后完成同 PR 自归档。

### 2026-02-10 23:27 +0800 Fresh 门禁复跑（格式修复后）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm -C apps/desktop test:run`
- Exit code: `0` / `0` / `0` / `0` / `0` / `0`
- Key output:
  - `contract:check` 通过（`pnpm contract:generate` 后 `ipc-generated.ts` 无差异）。
  - `[CROSS_MODULE_GATE] PASS`。
  - `test:unit` 通过。
  - `apps/desktop` vitest 全量通过：`Test Files 102 passed`，`Tests 1266 passed`。
