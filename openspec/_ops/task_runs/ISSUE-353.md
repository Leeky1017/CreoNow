# ISSUE-353

- Issue: #353
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/353
- Branch: task/353-context-engine-p0-layer-assembly-api
- PR: https://github.com/Leeky1017/CreoNow/pull/355
- Scope: 交付 `openspec/changes/context-engine-p0-layer-assembly-api`，落地四层组装契约、降级语义、`context:prompt:assemble` / `context:prompt:inspect` IPC，并完成主干收口
- Out of Scope: Token 预算裁剪策略、Stable Prefix 缓存命中策略扩展、Constraints CRUD 细节、P4 硬化项

## Plan

- [x] 准入：创建 OPEN issue、创建 task worktree、创建并校验 Rulebook task
- [x] Dependency Sync Check：核对 Context/AI/Search/IPC 主 spec，结论 `NO_DRIFT`
- [x] Red：先写 4 个 CE1 场景测试并保留失败证据
- [x] Green：实现 layer assembly service + context prompt IPC + contract codegen
- [x] 变更文档收口：勾选 change tasks、归档 change、更新 EXECUTION_ORDER
- [ ] 验证门禁：typecheck/lint/contract/cross-module/unit/preflight
- [ ] PR + auto-merge + main 收口 + worktree 清理

## Runs

### 2026-02-09 22:27 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Deliver context-engine-p0-layer-assembly-api change and merge to main" --body ...`
  - `gh issue edit 353 --body-file ...`
  - `scripts/agent_controlplane_sync.sh`
  - `scripts/agent_worktree_setup.sh 353 context-engine-p0-layer-assembly-api`
  - `rulebook task create issue-353-context-engine-p0-layer-assembly-api`
  - `rulebook task validate issue-353-context-engine-p0-layer-assembly-api`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/353`
  - worktree 创建成功：`.worktrees/issue-353-context-engine-p0-layer-assembly-api`
  - Rulebook task 校验通过

### 2026-02-09 22:31 +0800 Dependency Sync Check（CE P0 无上游漂移）

- Input:
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ai-service/spec.md`
  - `openspec/specs/ipc/spec.md`
- Checkpoints:
  - 数据结构：四层契约字段 `source/tokenCount/truncated` 可落地
  - IPC 契约：需满足仓库三段式 channel 命名门禁
  - 错误码：降级 warning 使用 `KG_UNAVAILABLE`，非阻断
  - 阈值：P0 不引入预算裁剪阈值（保持 out-of-scope）
- Conclusion: `NO_DRIFT`

### 2026-02-09 22:33 +0800 Red（失败测试证据）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/context/layer-assembly-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/layer-degrade-warning.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-assemble-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-inspect-contract.test.ts`
- Exit code: `1`
- Key output:
  - 4 个测试均失败：`ERR_MODULE_NOT_FOUND`
  - 缺失模块：`apps/desktop/main/src/services/context/layerAssemblyService`

### 2026-02-09 22:37 +0800 Green（最小实现 + 合同生成 + 场景转绿）

- Command:
  - `apply_patch`（新增 `layerAssemblyService.ts`，扩展 `ipc/context.ts`，更新 `ipc-contract.ts`）
  - `pnpm contract:generate`
  - `pnpm exec tsx apps/desktop/tests/unit/context/layer-assembly-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/layer-degrade-warning.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-assemble-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-inspect-contract.test.ts`
- Exit code: `0`
- Key output:
  - 新增 IPC：`context:prompt:assemble`、`context:prompt:inspect`
  - 重新生成：`packages/shared/types/ipc-generated.ts`
  - CE1 对应 4 个场景测试全部通过

### 2026-02-09 22:41 +0800 文档收口（change 归档 + 执行顺序同步）

- Command:
  - `apply_patch openspec/changes/context-engine-p0-layer-assembly-api/*.md`
  - `perl -0pi -e 's/- [ ]/- [x]/g' openspec/changes/context-engine-p0-layer-assembly-api/tasks.md`
  - `git mv openspec/changes/context-engine-p0-layer-assembly-api openspec/changes/archive/context-engine-p0-layer-assembly-api`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - change `context-engine-p0-layer-assembly-api` 已迁移至 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 同步为 15 个活跃 change，更新时间 `2026-02-09 22:41`

### 2026-02-09 22:46 +0800 门禁前验证（本地）

- Command:
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: `0`
- Key output:
  - Prettier 检查通过（changed files）
  - `typecheck` 通过
  - `lint` 通过（仅遗留历史 warnings，无 errors）
  - `contract:check`、`cross-module:check`、`test:unit` 全通过
