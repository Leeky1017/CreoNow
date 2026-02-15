# ISSUE-566

- Issue: #566
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/566
- Branch: task/566-s3-embedding-service
- PR: N/A（按任务约束：Do NOT create PR）
- Scope:
  - `openspec/changes/s3-embedding-service/**`
  - `apps/desktop/main/src/services/embedding/embeddingService.ts`
  - `apps/desktop/main/src/services/embedding/__tests__/{embedding-service.primary.test.ts,embedding-service.fallback.test.ts}`
  - `apps/desktop/main/src/ipc/{embedding.ts,rag.ts}`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `rulebook/tasks/issue-566-s3-embedding-service/{proposal.md,tasks.md,.metadata.json}`
  - `openspec/_ops/task_runs/ISSUE-566.md`
- Out of Scope:
  - PR / auto-merge / main 同步
  - Renderer 搜索 UI 改造
  - Hybrid RAG 排序公式调整

## Plan

- [x] 读取 AGENTS / project / delivery-skill / search-and-retrieval spec / change 文档
- [x] 执行依赖同步检查（Dependency Sync Check）并确认上游无漂移
- [x] 严格 TDD：先 Red（S1/S2/S3）再 Green
- [x] 同步 IPC error code 契约，避免类型漂移
- [x] 更新 Rulebook / change tasks / RUN_LOG 并完成本地验证

## Runs

### 2026-02-15 10:56-10:58 任务准入与规范加载

- Command:
  - `git status -sb && git branch --show-current`
  - `sed -n '1,260p' AGENTS.md`
  - `sed -n '1,260p' openspec/project.md`
  - `sed -n '1,320p' docs/delivery-skill.md`
  - `sed -n '1,320p' openspec/specs/search-and-retrieval/spec.md`
  - `sed -n '1,320p' openspec/changes/s3-embedding-service/{proposal.md,specs/search-and-retrieval-delta.md,tasks.md}`
  - `gh issue view 566 --json number,state,title,url`
- Exit code: `0`
- Key output:
  - 分支确认：`task/566-s3-embedding-service`
  - Issue 状态：`OPEN`
  - Scenario 目标：`S3-ES-S1/S2/S3`

### 2026-02-15 10:58 依赖安装

- Command: `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Done in 2.9s`

### 2026-02-15 10:59 依赖同步检查（Dependency Sync Check）

- Command:
  - `sed -n '1,320p' openspec/changes/archive/s3-onnx-runtime/specs/search-and-retrieval-delta.md`
  - `sed -n '1,360p' openspec/changes/archive/s3-onnx-runtime/tasks.md`
  - `sed -n '1,320p' openspec/changes/s3-embedding-service/specs/search-and-retrieval-delta.md`
  - `sed -n '1,320p' openspec/specs/search-and-retrieval/spec.md`
- Exit code: `0`
- Key output:
  - 上游 `s3-onnx-runtime` 已归档，路径为 `openspec/changes/archive/s3-onnx-runtime/**`
  - 关键契约无冲突：运行时错误显式化、禁止静默成功、允许有条件降级
- Drift decision: `NO_DRIFT`
- Follow-up:
  - 将 `openspec/changes/s3-embedding-service/proposal.md` 的依赖输入路径更新为 archive 路径后进入 Red

### 2026-02-15 11:00-11:02 Red（先失败）

- Command: `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-566-s3-embedding-service/apps/desktop/main/src/services/embedding/__tests__/embedding-service.primary.test.ts`
- Exit code: `1`
- Key output:
  - `AssertionError [ERR_ASSERTION]: false !== true`
  - `embedding-service.primary.test.ts:57:10`
  - Red 结论：S3-ES-S1 的统一 provider 编排尚未实现

- Command: `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-566-s3-embedding-service/apps/desktop/main/src/services/embedding/__tests__/embedding-service.fallback.test.ts`
- Exit code: `1`
- Key output:
  - `AssertionError [ERR_ASSERTION]: false !== true`
  - `embedding-service.fallback.test.ts:64:10`
  - Red 结论：S3-ES-S2/S3 的 fallback warning 与禁用失败语义尚未实现

### 2026-02-15 11:02-11:06 Green（最小实现）

- Code changes:
  - `embeddingService.ts`
    - 新增 `providerPolicy`（`primaryProvider` + `fallback`）统一编排
    - 新增 `PRIMARY_TIMEOUT` 分类与可配置 fallback 触发条件
    - fallback 成功时记录 `embedding_provider_fallback`（含 `primaryProvider`、`fallbackProvider`、`reason`）
    - fallback 禁用/不可触发时返回 `EMBEDDING_PROVIDER_UNAVAILABLE`
  - `ipc-contract.ts` + `ipc-generated.ts`
    - 新增错误码 `EMBEDDING_PROVIDER_UNAVAILABLE`
  - `ipc/embedding.ts`、`ipc/rag.ts`
    - 在 semantic/RAG 降级分支中接纳 `EMBEDDING_PROVIDER_UNAVAILABLE`

### 2026-02-15 11:06-11:08 Green 验证（S1/S2/S3 + 回归）

- Command:
  - `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-566-s3-embedding-service/apps/desktop/main/src/services/embedding/__tests__/embedding-service.primary.test.ts`
  - `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-566-s3-embedding-service/apps/desktop/main/src/services/embedding/__tests__/embedding-service.fallback.test.ts`
  - `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-566-s3-embedding-service/apps/desktop/main/src/services/embedding/__tests__/onnx-runtime.init.test.ts`
  - `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-566-s3-embedding-service/apps/desktop/main/src/services/embedding/__tests__/onnx-runtime.error.test.ts`
- Exit code: 全部 `0`
- Key output:
  - S3-ES-S1/S2/S3 全绿
  - ONNX 既有 S3-ONNX-S1/S2/S3 用例无回归

### 2026-02-15 11:08 契约生成

- Command: `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - `tsx scripts/contract-generate.ts`
  - `packages/shared/types/ipc-generated.ts` 已对齐更新

### 2026-02-15 11:09-11:11 受影响链路聚焦回归

- Command:
  - `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-566-s3-embedding-service/apps/desktop/tests/integration/search/semantic-fallback-fts.test.ts`
  - `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-566-s3-embedding-service/apps/desktop/tests/integration/rag-retrieve-rerank.test.ts`
- Exit code: 全部 `0`
- Key output:
  - embedding semantic fallback 与 rag rerank/fallback 链路保持通过

### 2026-02-15 11:11-11:12 格式化与 Rulebook 校验

- Command:
  - `pnpm exec prettier --write <changed-files>`
  - `rulebook task validate issue-566-s3-embedding-service`
- Exit code: 全部 `0`
- Key output:
  - prettier 仅改动 `embedding-service.fallback.test.ts`（其余文件 unchanged）
  - `✅ Task issue-566-s3-embedding-service is valid`

### 2026-02-15 11:12 契约检查补充

- Command: `pnpm contract:check`
- Exit code: `1`
- Key output:
  - `pnpm contract:generate && git diff --exit-code packages/shared/types/ipc-generated.ts`
  - diff 显示新增错误码 `EMBEDDING_PROVIDER_UNAVAILABLE` 已写入 `ipc-generated.ts`
- Resolution:
  - 该失败来自 `git diff --exit-code` 断言（用于检查是否存在待提交契约变更），非生成失败。
  - 本任务已保留生成后的 `packages/shared/types/ipc-generated.ts` 并纳入提交范围。

### 2026-02-15 11:13 最终类型校验

- Command: `pnpm typecheck`
- Exit code: `0`
- Key output:
  - `tsc --noEmit` 完成且无报错

## Dependency Sync Check

- Inputs:
  - `openspec/changes/archive/s3-onnx-runtime/specs/search-and-retrieval-delta.md`
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/changes/s3-embedding-service/{proposal.md,specs/search-and-retrieval-delta.md,tasks.md}`
- Result: `NO_DRIFT`
- Notes:
  - 上游契约内容稳定，仅需同步依赖输入文档路径（active → archive）。

## Evidence Summary

- S3-ES-S1：primary provider 成功返回向量，且未产生日志事件 `embedding_provider_fallback`。
- S3-ES-S2：primary timeout 时在显式策略允许下切到 fallback provider，并记录结构化 warning。
- S3-ES-S3：fallback 禁用时返回 `EMBEDDING_PROVIDER_UNAVAILABLE`，不再空结果伪成功。

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: 52a61ec774204a54a1f5ba019e9b601964ee14a4
- Spec-Compliance: PASS
- Code-Quality: PASS
- Fresh-Verification: PASS
- Blocking-Issues: 0
- Decision: ACCEPT
- Notes: task scope执行于指定 worktree，无 PR 创建。
