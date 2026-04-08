# 文档审计报告

> **审计时间**：2025-07-17
> **审计范围**：全仓库 Markdown 文档（101 个文件）
> **触发原因**：PR #78 合并治理文档后，对全仓库文档做一致性审计

---

## 一、审计范围

| 目录 | 文件数 | 说明 |
|------|--------|------|
| 根目录 | 5 | AGENTS.md, ARCHITECTURE.md, README.md, CLAUDE.md, COMPREHENSIVE-ANALYSIS.md |
| `docs/references/` | 11 | 开发参考文档（含本审计报告） |
| `docs/references/cc-analysis/` | 24 | Claude Code 分析报告（含 P1-P3 阶段文档） |
| `openspec/specs/` | 15 | 模块行为规范（含 rate-limiting-rfc、cross-module-integration） |
| `.github/` | 9 | PR 模板、Copilot 指令、Agent/Prompt 定义 |
| `.cn/` | 1 | 设计系统配置 |
| `apps/desktop/main/skills/` | 21 | Skill 定义文档（SKILL.md） |
| `scripts/` | 2 | 脚本文档 |
| `creonow-app/` | 3 | 子项目文档 |
| `figma_design/` | 8 | Figma 设计导出（含 guidelines、design tokens） |
| `docs/` (其他) | 2 | 前端规划文档 |

---

## 二、已修复的问题

### 2.1 README.md — 服务模块计数错误

- **问题**：声称 `src/services/` 有"13 service modules"，实际有 20 个
- **修复**：更正为 "20 service modules"
- **计数口径**：按 `apps/desktop/main/src/services/` 下顶层目录数统计

### 2.2 test-commands.md — CI Job 映射完全失实

- **问题**：CI Job 映射表列出 9 个不存在的 job 名称（`lint-and-typecheck`、`unit-test-core`、`unit-test-renderer` 等），实际 CI 只有一个 `check` job 包含 12 个 step
- **修复**：重写映射表，改为按 `.github/workflows/ci.yml` 实际 step 名称列出
- **同时修复**：
  - 移除不存在的 lint 和 format:check 命令引用（root package.json 中无这两个 script）
  - 更新 CI 失败排查表，匹配实际 step 名称
  - 更新 PR 提交前本地验证最小集

### 2.3 frontend-visual-quality.md — 多处过时标记

| 问题 | 修复 |
|------|------|
| `tokens.css` 标记"（待创建）"但文件已存在 | 移除"（待创建）" |
| `components/` 标记"（待创建）"但目录已存在 | 移除"（待创建）" |
| `components/patterns/` 作为组件层级但目录不存在 | 从层级表中删除（仅保留已存在的 `primitives/` 和 `composites/`） |
| test:visual 命令不存在 | 从 CI 验证命令中删除 |

### 2.4 cc-analysis/00-INDEX.md — 缺少阶段补充文档

- **问题**：索引只列出 16 份主报告，未提及 P1/P2/P3 阶段文档（6 个文件）
- **修复**：新增"阶段补充文档（Phase Supplements）"区块，单独列出，不混入主报告计数

### 2.5 AGENTS.md — 脚本索引更新

- **修复**：§十脚本索引中新增 `daily_doc_audit.sh`（每日文档健康检查）

### 2.6 scripts/README.md — 脚本清单更新

- **修复**：新增 `daily_doc_audit.sh` 条目

---

## 三、已确认无问题的文档

以下文档经审计确认内容准确、与 AGENTS.md / ARCHITECTURE.md 一致：

| 文档 | 状态 |
|------|------|
| AGENTS.md | ✅ 脚本引用全部存在，模块路径正确 |
| ARCHITECTURE.md | ✅ 已标注"20 服务模块"；计划路径明确标记"目标架构，尚未实现" |
| CLAUDE.md | ✅ 与 AGENTS.md 治理要求一致 |
| COMPREHENSIVE-ANALYSIS.md | ✅ 仍有参考价值，分析结论与当前代码结构一致 |
| docs/references/architecture-lessons.md | ✅ INV 引用正确 |
| docs/references/audit-protocol.md | ✅ 与 AGENTS.md §九一致 |
| docs/references/backend-design.md | ✅ 计划路径明确标记 |
| docs/references/gates-design.md | ✅ `pnpm lint` 已标记为"计划实现"，无误导 |
| docs/references/product-quality-checklist.md | ✅ 脚本引用正确 |
| docs/references/prompt-engineering-for-ui.md | ✅ Token 引用正确 |
| docs/references/testing-guide.md | ✅ 无过时引用 |
| docs/references/wsl-development-guide.md | ✅ 路径正确 |
| .github/PULL_REQUEST_TEMPLATE.md | ✅ INV-1~10 清单与 ARCHITECTURE.md 一致 |
| .github/copilot-instructions.md | ✅ 脚本引用正确，治理规则与 AGENTS.md 一致 |
| .github/agents/*.agent.md（4 个） | ✅ 角色定义与 AGENTS.md 一致 |
| .github/prompts/*.prompt.md（3 个） | ✅ 流程指令与对应 agent 一致 |
| scripts/README.md | ✅ 25 个脚本全部存在 |
| 13 个 openspec/specs/*/spec.md | ✅ 模块与 services/ 目录对应 |

---

## 四、已知问题（不在本次修复范围内）

### 4.1 cc-analysis 文档中的计划路径

`docs/references/cc-analysis/P1-CHANGES.md`、`P2-CHANGES.md`、`P3-CHANGES.md` 中大量引用了从未实现的文件路径（如 `services/ai/cost/`、`services/context/compression/` 等）。这些是历史分析文档中的实施计划，不是对当前代码的引用，不做修改。

### 4.2 OpenSpec 中的计划路径

- `ipc/spec.md` 引用 `packages/shared/types/ipc/` 等目录（实际结构为 `packages/shared/types/ipc-generated.ts`）
- `workbench/spec.md` 引用 docs/release/ 和 i18n-inventory-scan 脚本（均未实现）

这些属于 spec 对未来实现的描述，待对应功能实现时同步更新。

### 4.3 creonow-app/ 子项目

`creonow-app/` 为独立 Next.js 子项目，其 `AGENTS.md` 和 `CLAUDE.md` 是指向根目录的重定向。README.md 为 Next.js 样板文档。作为独立子项目保留，不做修改。

---

## 五、新增产物

| 文件 | 说明 |
|------|------|
| `scripts/daily_doc_audit.sh` | 自动化文档健康检查脚本 |
| `docs/references/doc-audit-report.md` | 本文件 |
