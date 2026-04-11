# CreoNow 开发 Playbook

> 本文件夹是 CN 各开发阶段的完整规划手册。给 Agent 发任务、查阶段、补细节时，先来这里找。

## 阶段总览

| 阶段 | 名称 | 目标 | 状态 |
|------|------|------|------|
| P1 | 系统脊柱 | 闭环 Demo：选文 → AI 改写 → 预览 Diff → 确认 → 版本 → 撤销 | 🟡 80% |
| P3 | 项目智能 | 多文档项目 + KG 集成 + Memory 注入 + FTS 搜索 | 🟡 60% |
| P4+ | 高级智能 | 完整 3 层 Memory + KG 可视化 + 语义搜索 + 叙事压缩 | ⚪ 规划中 |
| P5 | 成瘾 + 热爱 | 14 个成瘾机制 + 5 个热爱维度落地 | ⚪ 规划中 |
| 前端 | 黄金标准落地 | `figma_design/前端完整参考/` → Electron renderer 逐页落地 | 🟡 设计完成，实现进行中 |

## 文件索引

| 文件 | 内容 | 使用场景 |
|------|------|---------|
| `00-status-matrix.md` | 模块成熟度矩阵 + INV 合规现状 | 任何任务前先查现状 |
| `01-p1-system-spine.md` | P1 收尾任务清单 | P1 剩余任务 |
| `02-p3-project-intelligence.md` | P3 完整规划 | P3 任务分解 |
| `03-p4-advanced-intelligence.md` | P4+ 完整规划 | 远期规划 |
| `04-engagement-rollout.md` | 成瘾 + 热爱引擎落地 | 功能体验设计 |
| `05-frontend-roadmap.md` | 前端页面推进路线 | 前端任务 |
| `06-task-templates.md` | Issue/任务模板 | 发任务时复制 |
| `07-boundary-decisions.md` | 边界决策记录 | 技术选型争议时 |

## 关键引用

- 架构总纲：`ARCHITECTURE.md`
- Agent 宪法：`AGENTS.md`
- 前端黄金源：`figma_design/前端完整参考/`
- 视觉规范：`docs/references/frontend-visual-quality.md`
- 成瘾引擎：`docs/references/engagement-engine.md`
- 各模块 Spec：`openspec/specs/<module>/spec.md`
- 测试指南：`docs/references/testing-guide.md`
- 后端现状：`docs/references/backend-quality-assessment.md`

## 使用方法

1. **发任务前**：先读 `00-status-matrix.md` 了解当前模块状态
2. **拆 Issue**：从对应阶段文件中找到任务，复制 `06-task-templates.md` 中的模板
3. **技术选型争议**：查 `07-boundary-decisions.md`
4. **Agent 执行任务**：Agent 应先读本 README，再读对应阶段文件，再读相关 spec
