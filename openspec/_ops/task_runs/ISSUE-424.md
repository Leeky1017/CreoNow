# ISSUE-424

- Issue: #424
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/424
- Branch: task/424-skill-system-p4-hardening-boundary
- PR: 待回填
- Scope: 完成交付 `openspec/changes/skill-system-p4-hardening-boundary` 全部任务（P4 边界硬化、异常矩阵、NFR 与契约收口），并合并回控制面 `main`
- Out of Scope: 新增技能功能特性、替换既有 IPC 命名空间、修改 p0-p3 已归档行为契约

## Plan

- [x] 准入：创建 OPEN issue #424 + task 分支与 worktree
- [x] Rulebook task 完整化并 validate
- [x] Dependency Sync Check（skill p0~p3）结论落盘
- [x] Red：先写失败测试并记录证据
- [x] Green：最小实现通过
- [x] Refactor：抽取边界常量与错误构造并保持绿灯
- [ ] 门禁：typecheck/lint/contract/cross-module/unit/integration/preflight
- [ ] PR + auto-merge + main 收口 + Rulebook/OpenSpec 归档 + worktree 清理

## Runs

### 2026-02-12 11:57 +0800 准入（Issue）

- Command:
  - `gh issue create --title "Deliver skill-system-p4-hardening-boundary change and merge to main" --body-file - <<'EOF' ... EOF`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/424`

### 2026-02-12 11:59 +0800 环境隔离（origin/main 基线 + worktree）

- Command:
  - `git fetch origin main && git rev-list --left-right --count main...origin/main`
  - `git worktree add -b task/424-skill-system-p4-hardening-boundary .worktrees/issue-424-skill-system-p4-hardening-boundary origin/main`
- Exit code: `0`
- Key output:
  - `main` 与 `origin/main` 一致：`0 0`
  - worktree 创建成功：`.worktrees/issue-424-skill-system-p4-hardening-boundary`

### 2026-02-12 12:02 +0800 Rulebook task 初始化

- Command:
  - `rulebook task create issue-424-skill-system-p4-hardening-boundary`
  - `rulebook task validate issue-424-skill-system-p4-hardening-boundary`
  - `cp -R rulebook/tasks/issue-424-skill-system-p4-hardening-boundary .worktrees/issue-424-skill-system-p4-hardening-boundary/rulebook/tasks/`
- Exit code: `0`
- Key output:
  - task 创建成功：`issue-424-skill-system-p4-hardening-boundary`
  - 首次 validate：`valid=true`（warning: `No spec files found`）

### 2026-02-12 12:08 +0800 Rulebook task 完整化 + validate

- Command:
  - `apply_patch rulebook/tasks/issue-424-skill-system-p4-hardening-boundary/{proposal.md,tasks.md}`
  - `apply_patch rulebook/tasks/issue-424-skill-system-p4-hardening-boundary/specs/skill-system/spec.md`
  - `rulebook task validate issue-424-skill-system-p4-hardening-boundary`
- Exit code: `0`
- Key output:
  - Rulebook task 校验通过：`✅ Task issue-424-skill-system-p4-hardening-boundary is valid`
  - warning 已消除（`specs/skill-system/spec.md` 已补齐）

### 2026-02-12 12:10 +0800 Dependency Sync Check（Skill p0~p3）

- Input:
  - `openspec/changes/archive/skill-system-p0-builtin-skills-executor/specs/skill-system-delta.md`
  - `openspec/changes/archive/skill-system-p1-trigger-scope-management/specs/skill-system-delta.md`
  - `openspec/changes/archive/skill-system-p2-custom-skill-crud/specs/skill-system-delta.md`
  - `openspec/changes/archive/skill-system-p3-scheduler-concurrency-timeout/specs/skill-system-delta.md`
  - `apps/desktop/main/src/services/skills/skillService.ts`
  - `apps/desktop/main/src/services/skills/skillScheduler.ts`
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Checkpoints:
  - 数据结构：`custom_skills` 结构与 p2 一致（`id/name/description/prompt_template/input_type/context_rules/scope/project_id/enabled/created_at/updated_at`），无漂移。
  - IPC 契约：`ai:skill:run`、`ai:skill:cancel`、`skill:custom:*`、`skill:registry:toggle` 均已声明 request/response schema；push 通道 `skill:stream:chunk|done` 保持稳定。
  - 错误码：p3 既有 `SKILL_TIMEOUT/SKILL_DEPENDENCY_MISSING/SKILL_QUEUE_OVERFLOW` 链路完整；p4 新增 `SKILL_CAPACITY_EXCEEDED/SKILL_SCOPE_VIOLATION` 尚未实现（属于本 change 目标，不判定为依赖漂移）。
  - 阈值：并发 `8`、会话队列 `20`、超时默认 `30000`/最大 `120000` 与 p3 约束一致。
- Conclusion: `NO_DRIFT`（可进入 Red）

### 2026-02-12 12:12 +0800 Red 前置阻塞（worktree 未安装依赖）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/skill-scope-management.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
- Exit code: `1`
- Key output:
  - `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`
  - `Command "tsx" not found`
  - 处置：按规则执行 `pnpm install --frozen-lockfile`

### 2026-02-12 12:13 +0800 环境修复（依赖安装）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - 依赖安装完成，`tsx 4.21.0` 可用

### 2026-02-12 12:14 +0800 Red（P4 失败测试证据）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/skill-scope-management.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
- Exit code: `1`
- Key output:
  - `skill-scope-management.test.ts`：`true !== false`（全局/项目容量超限未阻断）
  - `skill-session-queue-limit.test.ts`：`true !== false`（单输出超长未返回 `IPC_PAYLOAD_TOO_LARGE`）
  - `cross-module-drift-zero.spec.ts`：缺失错误码 `SKILL_CAPACITY_EXCEEDED` / `SKILL_SCOPE_VIOLATION`

### 2026-02-12 12:18 +0800 Green（最小实现 + 契约更新）

- Command:
  - `apply_patch apps/desktop/main/src/services/skills/skillService.ts`
  - `apply_patch apps/desktop/main/src/services/ai/aiService.ts`
  - `apply_patch apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apply_patch openspec/guards/cross-module-contract-baseline.json`
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - 自定义技能容量上限：global `1000`、project `500`，超限返回 `SKILL_CAPACITY_EXCEEDED`
  - 跨项目 project skill 越权访问返回 `SKILL_SCOPE_VIOLATION`，并写 `skill_scope_violation` 审计日志
  - 单输出超长返回 `IPC_PAYLOAD_TOO_LARGE`
  - IPC 错误码新增 `SKILL_CAPACITY_EXCEEDED`、`SKILL_SCOPE_VIOLATION` 并完成 codegen

### 2026-02-12 12:20 +0800 Green 验证（Red 用例转绿）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/skill-scope-management.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
- Exit code: `0`
- Key output:
  - P4 对应 Red 用例全部通过

### 2026-02-12 12:22 +0800 门禁执行（全链路）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `git add packages/shared/types/ipc-generated.ts && pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm test:integration`
- Exit code: `0`
- Key output:
  - `typecheck` 通过
  - `lint` 通过
  - `contract:check` 通过
  - `cross-module:check` 输出 `[CROSS_MODULE_GATE] PASS`
  - `test:unit` 通过
  - `test:integration` 通过

### 2026-02-12 12:36 +0800 NFR 基准（SLO 阈值记录）

- Command:
  - `pnpm exec tsx tmp-skill-p4-bench.ts`（临时基准脚本）
- Exit code: `0`
- Key output:
  - `executeResponseP95Ms = 1`（阈值 `<120ms`，通过）
  - `queueEnqueueP95Ms = 0`（阈值 `<80ms`，通过）
  - `cancelEffectiveP95Ms = 0`（阈值 `<300ms`，通过）
- Cleanup:
  - `tmp-skill-p4-bench.ts` 已删除（非交付文件）

### 2026-02-12 12:27 +0800 OpenSpec 收口（change 归档 + 顺序同步）

- Command:
  - `git mv openspec/changes/skill-system-p4-hardening-boundary openspec/changes/archive/skill-system-p4-hardening-boundary`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `skill-system-p4-hardening-boundary` 已归档至 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 活跃 change 数从 `3` 更新为 `2`

### 2026-02-12 12:29 +0800 preflight 阻断确认（PR 链接待回填）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-424.md: 待回填`
  - 结论：需创建 PR 并回填真实链接后复跑 preflight
