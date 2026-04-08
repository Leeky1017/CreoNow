> 本文件是 gates-design 的一部分，完整索引见 [docs/references/gates-design/README.md](README.md)

# Agent 自治三阶段

---

## 阶段 A — 先设计后编码（强制）

Agent 写代码之前必须先输出：

- 涉及哪些 INV-*
- 模块边界图
- Definition of Done

写入 PR 描述，CI 检查存在性（计划实现，当前由人工审查确认）。

> **已实现位置**：PR 模板 `.github/PULL_REQUEST_TEMPLATE.md` 包含设计文档和 INV Checklist 的填写区域。CI 自动检查 PR body 中 INV 存在性为计划实现。

## 阶段 B — 受约束编码

PR 描述包含 Invariant Checklist（INV-1~10 逐条勾选），CI 自动解析（计划实现），未填写 = 阻止合并。

每条必须声明：

- 遵守：本次改动符合该 INV
- 不涉及：本次改动与该 INV 无关
- 违反（附理由）：明确说明为什么违反以及补救措施

> Invariant Checklist CI 解析脚本设计见 [l2-pr-gates.md](l2-pr-gates.md)。

## 阶段 C — Agent 审 Agent（计划实现，当前由人工 + Agent 协作完成）

合并后触发 Audit Agent（计划自动化）：

- 检查代码是否符合 AGENTS.md Invariant
- 注释是否合规（模块入口注释、阈值注释）
- 测试覆盖率是否达标
- 输出审计报告

> **当前状态**：审计流程由 `creonow-audit` Agent 和 `creonow-reviewer` Agent 手动触发，尚未在 CI 中自动化。审计协议详见 `docs/references/audit-protocol.md`。
