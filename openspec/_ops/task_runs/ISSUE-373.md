# ISSUE-373

- Issue: #373
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/373
- Branch: task/373-search-retrieval-p3-hybrid-ranking-explain
- PR: (待回填)
- Scope: 完成交付 `openspec/changes/search-retrieval-p3-hybrid-ranking-explain`（两阶段召回、融合重排、Top50+分页、`search:query:strategy` 与 `search:rank:explain` 契约），并按治理流程合并回控制面 `main`
- Out of Scope: 调整权重公式与阈值参数、引入第三种检索策略、改造搜索替换链路

## Plan

- [x] 准入：创建 OPEN issue #373 + task 分支与 worktree
- [x] Rulebook task 创建并 validate
- [x] Dependency Sync Check（SR-1/SR-2/SR-3 + ipc）结论落盘
- [x] Red：SR4-R1-S1~S2 失败测试证据落盘
- [x] Green：`search:query:strategy` + `search:rank:explain` 最小链路通过
- [x] Refactor：重排计算与 explain 输出重构并保持绿灯
- [ ] preflight 全绿
- [ ] PR + auto-merge + main 收口 + worktree 清理

## Runs

### 2026-02-10 11:56 +0800 准入（Issue / Rulebook）

- Command:
  - `gh issue create --title "Deliver search-retrieval-p3-hybrid-ranking-explain change and merge to main" --body "..."`
  - `gh issue view 373 --json number,title,state,url,body`
  - `rulebook task create issue-373-search-retrieval-p3-hybrid-ranking-explain`
  - `rulebook task validate issue-373-search-retrieval-p3-hybrid-ranking-explain`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/373`
  - Issue 状态：`OPEN`
  - Rulebook task 创建成功并 validate 通过（warning: `No spec files found`）

### 2026-02-10 11:58 +0800 环境隔离（控制面同步 / worktree）

- Command:
  - `git stash push -u -m "issue-373-bootstrap"`
  - `scripts/agent_worktree_setup.sh 373 search-retrieval-p3-hybrid-ranking-explain`
  - `git -C .worktrees/issue-373-search-retrieval-p3-hybrid-ranking-explain stash pop`
- Exit code: `0`
- Key output:
  - 控制面 `main` 已同步到 `origin/main`
  - worktree 创建成功：`.worktrees/issue-373-search-retrieval-p3-hybrid-ranking-explain`
  - 分支创建成功：`task/373-search-retrieval-p3-hybrid-ranking-explain`

### 2026-02-10 12:00 +0800 Dependency Sync Check（SR4）

- Input:
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/changes/archive/search-retrieval-p0-fts-foundation/specs/search-and-retrieval-delta.md`
  - `openspec/changes/archive/search-retrieval-p1-embedding-semantic-rag/specs/search-and-retrieval-delta.md`
  - `openspec/changes/archive/search-retrieval-p2-replace-versioned/specs/search-and-retrieval-delta.md`
- Checkpoints:
  - 数据结构：`finalScore` / `scoreBreakdown` / 分页字段均可判定
  - IPC 契约：新增 `search:query:strategy`、`search:rank:explain` 命名与 envelope 一致
  - 错误码：策略非法值返回 `INVALID_ARGUMENT`，数据库/检索失败返回 `DB_ERROR`
  - 阈值：保持固定公式 `0.55/0.35/0.10`、隐藏阈值 `0.25`、候选上限 `10,000`
- Conclusion: `NO_DRIFT`

### 2026-02-10 12:02 +0800 Red 依赖阻塞与修复

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/hybrid-ranking-explain.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/hybrid-pagination-tie-break.test.ts`
  - `pnpm install --frozen-lockfile`
- Exit code:
  - 前两条命令 `1`（`Command "tsx" not found`）
  - 安装命令 `0`
- Key output:
  - 失败原因：worktree 初始缺少 `tsx`
  - 处置：按约束执行 `pnpm install --frozen-lockfile`

### 2026-02-10 12:03 +0800 Red（先写失败测试）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/hybrid-ranking-explain.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/hybrid-pagination-tie-break.test.ts`
- Exit code: `1`
- Key output:
  - 两个场景均失败：`Missing handler search:query:strategy`
  - 失败原因符合预期（SR4 新通道未实现）

### 2026-02-10 12:06 +0800 Green（最小实现 + Refactor）

- Command:
  - `apply_patch`（新增 `apps/desktop/main/src/services/search/hybridRankingService.ts`）
  - `apply_patch`（更新 `apps/desktop/main/src/ipc/search.ts`）
  - `apply_patch`（更新 `apps/desktop/main/src/index.ts`）
  - `apply_patch`（更新 `apps/desktop/main/src/ipc/contract/ipc-contract.ts`）
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - 新增 `search:query:strategy`（`fts|semantic|hybrid`）
  - 新增 `search:rank:explain`（按 `documentId+chunkId` 返回排序拆解）
  - 落地融合公式：`0.55*bm25 + 0.35*semantic + 0.10*recency`
  - 固化规则：去重键、`finalScore < 0.25` 过滤、Top50 分页、同分 `updatedAt` 降序、候选上限 `10,000`
  - Refactor：重排与 explain 统一走 `hybridRankingService`

### 2026-02-10 12:08 +0800 Green 验证（SR4-R1-S1~S2）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/hybrid-ranking-explain.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/hybrid-pagination-tie-break.test.ts`
- Exit code:
  - 首轮 `1`（测试数据导致断言不满足）
  - 修正测试数据后重跑 `0`
- Key output:
  - S1：hybrid 首屏返回 50 条并含 `scoreBreakdown`
  - S2：`hasMore=true` 时分页可继续加载；同分场景按 `updatedAt desc` 稳定排序

### 2026-02-10 12:12 +0800 回归验证链

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm test:integration`
- Exit code:
  - `typecheck` => `0`
  - `lint` => `0`（仅历史 warning，无 error）
  - `contract:check` => `1`（预期：新增通道导致 `ipc-generated.ts` 相对 `HEAD` 有差异）
  - `cross-module:check` => `0`
  - `test:unit` => `0`
  - `test:integration` => `0`
- Key output:
  - cross-module gate: `PASS`
  - 全量 unit / integration 均通过
  - `contract:check` 失败原因为预期的生成物差异，待提交后由 preflight 复核

### 2026-02-10 12:12 +0800 Prettier 阻塞修复

- Command:
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm exec prettier --write apps/desktop/main/src/ipc/search.ts apps/desktop/main/src/services/search/hybridRankingService.ts apps/desktop/tests/integration/search/hybrid-ranking-explain.test.ts apps/desktop/tests/integration/search/hybrid-ranking-test-harness.ts openspec/_ops/task_runs/ISSUE-373.md rulebook/tasks/issue-373-search-retrieval-p3-hybrid-ranking-explain/.metadata.json rulebook/tasks/issue-373-search-retrieval-p3-hybrid-ranking-explain/proposal.md rulebook/tasks/issue-373-search-retrieval-p3-hybrid-ranking-explain/tasks.md`
- Exit code:
  - `prettier --check` => `1`
  - `prettier --write` => `0`
- Key output:
  - 8 个文件格式化完成，preflight 格式阻塞已消除

### 2026-02-10 12:13 +0800 Change 收口（任务勾选 + 归档 + 顺序文档同步）

- Command:
  - `perl -0pi -e 's/- [ ]/- [x]/g' openspec/changes/search-retrieval-p3-hybrid-ranking-explain/tasks.md`
  - `git mv openspec/changes/search-retrieval-p3-hybrid-ranking-explain openspec/changes/archive/search-retrieval-p3-hybrid-ranking-explain`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - change 已归档：`openspec/changes/archive/search-retrieval-p3-hybrid-ranking-explain`
  - `EXECUTION_ORDER.md` 已同步为 6 个活跃 change，更新时间 `2026-02-10 12:13`
  - Search & Retrieval 泳道更新为仅 `p4`

### 2026-02-10 12:14 +0800 Preflight 状态

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-373.md: (待回填)`
  - 结论：等待创建 PR 后由自动脚本回填真实链接，再复跑 preflight
