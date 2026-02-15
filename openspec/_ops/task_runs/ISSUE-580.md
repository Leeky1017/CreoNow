# ISSUE-580

- Issue: #580
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/580
- Branch: task/580-s3-project-templates
- PR: N/A（Owner 指令：Do NOT open PR or merge）
- Scope:
  - `apps/desktop/main/src/services/projects/projectService.ts`
  - `apps/desktop/main/src/services/projects/templateService.ts`
  - `apps/desktop/main/src/services/projects/__tests__/template-service-apply.test.ts`
  - `apps/desktop/main/src/services/projects/__tests__/template-schema-validation.test.ts`
  - `apps/desktop/main/templates/project/*.json`
  - `apps/desktop/main/src/ipc/project.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/integration/project-management/project-create-template-contract.test.ts`
  - `apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`
  - `apps/desktop/renderer/src/features/projects/CreateProjectDialog.test.tsx`
  - `apps/desktop/renderer/src/stores/projectStore.tsx`
  - `rulebook/tasks/issue-580-s3-project-templates/{proposal.md,tasks.md}`
  - `openspec/changes/s3-project-templates/tasks.md`
- Out of Scope:
  - 在线模板市场、模板版本管理、AI 自动生成模板扩展
  - PR / auto-merge / main sync

## Plan

- [x] 完成 Spec-first 阅读链与场景映射
- [x] 执行 `pnpm install --frozen-lockfile`
- [x] S1/S2/S3 先 Red 再 Green
- [x] 跑受影响 project-management 测试
- [x] 更新治理文档与 RUN_LOG
- [x] commit + push

## Dependency Sync Check

- Upstream dependency: `N/A`
- Inputs:
  - `docs/plans/unified-roadmap.md`（AR-C36）
  - `openspec/specs/project-management/spec.md`
  - `openspec/changes/s3-project-templates/specs/project-management-delta.md`
- Result: `NO_DRIFT`
- Rationale:
  - 本 change 无上游 change 依赖；实现仅增强 `project:create` 初始化路径，未改变既有响应契约字段。

## Runs

### 2026-02-15 14:54-14:55 基线与必读材料

- Command:
  - `sed -n '1,320p' AGENTS.md`
  - `sed -n '1,220p' openspec/project.md`
  - `sed -n '1,520p' openspec/specs/project-management/spec.md`
  - `sed -n '1,260p' docs/delivery-skill.md`
  - `sed -n '1,220p' openspec/changes/s3-project-templates/{proposal.md,tasks.md,specs/project-management-delta.md}`
- Key output:
  - 读取完成，确认本次交付目标为 S1/S2/S3 与模板化创建链路。

### 2026-02-15 14:56 环境基线

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Done in 2.4s`

### 2026-02-15 14:58 RED 失败证据（S1/S2/S3）

- Command:
  - `pnpm exec tsx .../apps/desktop/main/src/services/projects/__tests__/template-service-apply.test.ts`
  - `pnpm exec tsx .../apps/desktop/main/src/services/projects/__tests__/template-schema-validation.test.ts`
  - `pnpm exec tsx .../apps/desktop/tests/integration/project-management/project-create-template-contract.test.ts`
- Exit code: `1`（三条均失败）
- Key output:
  - S1: `screenplay template should create at least two initial documents`
  - S3: `invalid custom template must be rejected`
  - S2: `project:create should accept template input`

### 2026-02-15 15:00-15:05 GREEN 最小实现与契约同步

- Command:
  - 编辑模板资源 / 模板服务 / project:create / ipc-contract / renderer 透传
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - 生成 `packages/shared/types/ipc-generated.ts` 新契约，`project:project:create` 请求支持可选 `template` 字段。

### 2026-02-15 15:05-15:07 focused + impacted 验证

- Command:
  - `pnpm exec tsx .../template-service-apply.test.ts`
  - `pnpm exec tsx .../template-schema-validation.test.ts`
  - `pnpm exec tsx .../project-create-template-contract.test.ts`
  - `pnpm exec tsx .../projectService.create.test.ts`
  - `pnpm exec tsx .../projectIpc.validation.test.ts`
  - `pnpm exec tsx .../project-lifecycle.state-machine.test.ts`
  - `pnpm exec tsx .../projectService.projectActions.test.ts`
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/projects/CreateProjectDialog.test.tsx`
- Exit code: `0`
- Key output:
  - focused S1/S2/S3 全通过
  - 受影响 project-management 单测/集成通过
  - vitest: `20 passed`

### 2026-02-15 15:07-15:10 格式与复验

- Command:
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm exec prettier --write apps/desktop/main/src/services/projects/templateService.ts apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm exec tsx .../template-service-apply.test.ts`
  - `pnpm exec tsx .../template-schema-validation.test.ts`
  - `pnpm exec tsx .../project-create-template-contract.test.ts`
- Exit code: `0`
- Key output:
  - `All matched files use Prettier code style!`
  - 三条 focused tests 复验通过。

### 2026-02-15 15:11 Rulebook 校验

- Command:
  - `rulebook task validate issue-580-s3-project-templates`
- Exit code: `0`
- Key output:
  - `Task issue-580-s3-project-templates is valid`
  - Warning: `No spec files found (specs/*/spec.md)`（仅告警，不阻断本任务）

### 2026-02-15 15:12 提交与推送

- Command:
  - `git add -A`
  - `git commit -m "feat: implement project-create templates flow (#580)"`
  - `git push origin task/580-s3-project-templates`
- Exit code: `0`
- Key output:
  - Commit: `97f681da`
  - Push: `task/580-s3-project-templates -> origin/task/580-s3-project-templates`

## Evidence

- RED→GREEN 测试文件：
  - `apps/desktop/main/src/services/projects/__tests__/template-service-apply.test.ts`
  - `apps/desktop/main/src/services/projects/__tests__/template-schema-validation.test.ts`
  - `apps/desktop/tests/integration/project-management/project-create-template-contract.test.ts`
- 模板实现：
  - `apps/desktop/main/src/services/projects/templateService.ts`
  - `apps/desktop/main/templates/project/*.json`
  - `apps/desktop/main/src/services/projects/projectService.ts`
  - `apps/desktop/main/src/ipc/project.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/renderer/src/stores/projectStore.tsx`
  - `apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`

## Main Session Audit

- Status: PENDING（按本任务约束，主会话签字由 lead 在后续阶段完成）
