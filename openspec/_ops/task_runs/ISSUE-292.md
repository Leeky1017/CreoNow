# ISSUE-292

- Issue: #292
- Branch: task/292-memory-system-p0-p3-change-specs
- PR: https://github.com/Leeky1017/CreoNow/pull/294

## Plan

- 依据 AGENTS.md 与 openspec 规范，为 Memory System 创建 4 个串行 change：MS-1~MS-4。
- 每个 change 交付 `proposal.md`、`specs/memory-system-delta.md`、`tasks.md`。
- 更新 `openspec/changes/EXECUTION_ORDER.md`，明确串行顺序与依赖。
- 创建并验证 Rulebook task，确保 Rulebook-first。

## Runs

### 2026-02-08 19:44 任务准入与规范阅读

- Command: `sed -n '1,220p' AGENTS.md`
- Key output: 确认 Spec-first、Rulebook-first、TDD 章节顺序、EXECUTION_ORDER 强制维护。
- Command: `sed -n '1,220p' openspec/project.md`
- Key output: 确认 Memory System 属于核心引擎模块，路径与边界正确。
- Command: `sed -n '1,620p' openspec/specs/memory-system/spec.md`
- Key output: 提取主 spec requirement、跨切验收标准、异常矩阵。

### 2026-02-08 19:47 模板与样例对齐

- Command: `sed -n '1,260p' openspec/changes/_template/tasks.md`
- Key output: 确认 tasks.md 必须使用 6 个固定章节顺序。
- Command: `sed -n '1,260p' openspec/changes/archive/ai-model-catalog-discovery/tasks.md`
- Key output: 对齐 Scenario→Test 映射写法与变更描述粒度。

### 2026-02-08 19:50 创建任务入口（Issue + Rulebook）

- Command: `gh issue create --title "Memory System: draft MS-1~MS-4 OpenSpec changes" --body "..."`
- Key output: 创建 Issue `#292`。
- Note: 首次命令因 shell 反引号展开产生报错噪音，Issue 已创建但正文被污染。
- Command: `gh issue edit 292 --body-file /tmp/issue-292-body.md`
- Key output: Issue 正文修正完成。
- Command: `rulebook_task_create(issue-292-memory-system-p0-p3-change-specs)`
- Key output: Rulebook task 创建成功。
- Command: `rulebook_task_validate(issue-292-memory-system-p0-p3-change-specs)`
- Key output: `valid=true`。

### 2026-02-08 19:52-19:56 落盘四个 change 与执行顺序

- 创建目录与文件：
  - `openspec/changes/memory-system-p0-architecture-episodic-storage/*`
  - `openspec/changes/memory-system-p1-distillation-decay-conflict/*`
  - `openspec/changes/memory-system-p2-panel-provenance/*`
  - `openspec/changes/memory-system-p3-isolation-degradation/*`
- Command: `cat > openspec/changes/EXECUTION_ORDER.md <<EOF ... EOF`
- Key output: 首次写入因反引号展开报错。
- Command: 重新写入 `EXECUTION_ORDER.md`（去除反引号风险）
- Key output: 串行顺序与依赖关系写入成功。

### 2026-02-08 19:57 Rulebook 补全与校验

- Command: 写入 `rulebook/tasks/issue-292-memory-system-p0-p3-change-specs/{proposal.md,tasks.md,specs/memory-system/spec.md}`
- Key output: 去除模板占位符，补全 task 级需求映射。
- Command: `rulebook_task_validate(issue-292-memory-system-p0-p3-change-specs)`
- Key output: `valid=true`, `warnings=[]`。

### 2026-02-08 19:58 结构自检

- Command: `for f in openspec/changes/memory-system-p*/tasks.md; do rg -n "^## " "$f"; done`
- Key output: 四个 tasks.md 均满足固定 6 章节顺序。
- Command: `for f in openspec/changes/memory-system-p*/specs/memory-system-delta.md; do rg -n "^## \[|^### Scenario" "$f"; done`
- Key output: 核心 requirement 与跨切场景均已落盘。


### 2026-02-08 20:00 PR 创建与 RUN_LOG 回填

- Command: `gh pr create --base main --head task/292-memory-system-p0-p3-change-specs ...`
- Key output: 创建 PR `https://github.com/Leeky1017/CreoNow/pull/294`。
- Command: 更新 `openspec/_ops/task_runs/ISSUE-292.md` 的 `Branch` 与 `PR` 字段
- Key output: RUN_LOG 通过 preflight 的 PR URL 约束。
