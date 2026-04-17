# CreoNow 开发 Playbook

> 本文件夹不是「理想架构许愿池」，而是 **CN 当前真实进度 + 下一段可执行路线图**。发任务前先读这里，再读对应 spec / 参考文档。
>
> 本次同步基于仓库状态：`main@ba09b67`（2026-04-17）与当前 open issues / PR。

## 阶段总览

| 阶段 | 名称 | 目标 | 当前判断 |
|------|------|------|------|
| P1 | 系统脊柱 | 选文 → AI 预览 → 确认 → 快照 → 写回 → 撤销 | ✅ 主闭环已打通；文档改为收尾与加固视角 |
| P3 | 项目智能 | 多文档项目 + KG + Memory + 搜索 + Hook 链 | 🟡 大部分骨架已落地；剩上下文注入、产品入口与端到端细节 |
| P4+ | 高级智能 | 记忆深化 + KG 可视化 + 语义搜索 + AutoCompact + Agentic loop | 🟡 不再是纯规划；KG 图和语义搜索已落地，剩高阶 follow-up |
| P5 | 成瘾 + 热爱 | Engagement / 仪式感 / 长期黏性体验 | 🟡 第一批基础服务已落地，前端接线与后续机制仍在推进 |
| 前端 | 黄金标准落地 | `figma_design/前端完整参考/` → Electron renderer 增量对齐 | 🟡 Workbench 主体已成形，剩页面深水区与细部对齐 |

## 文件索引

| 文件 | 现在用途 |
|------|------|
| `00-status-matrix.md` | 当前模块成熟度、INV 合规、已落地/未落地判断 |
| `01-p1-system-spine.md` | P1 已完成事项 + 剩余后端收尾/加固路线 |
| `02-p3-project-intelligence.md` | P3 已落地能力、未收口项与执行顺序 |
| `03-p4-advanced-intelligence.md` | P4+ 现实状态与 follow-up 议程 |
| `04-engagement-rollout.md` | ENG 已完成基础 vs 剩余机制路线 |
| `05-frontend-roadmap.md` | 当前 Electron renderer / workbench 页面落地现状 |
| `06-task-templates.md` | Issue / 任务模板 |
| `07-boundary-decisions.md` | 技术与产品边界的已确认决策 |

## 当前 open issue 地图

### 架构 / 智能 follow-up
- `#190` P4-01-FU：episodic-memory Skills + hook
- `#191` P4-02-FU：KG Canvas 1000 节点性能 / d3-force
- `#192` P4-03-FU：semantic search service 边界 + INV-8 索引 hook
- `#193` P4-04-FU：AutoCompact v2 预览 / 回退 / 历史
- `#194` P4-05-FU：Agentic loop 超时 / pause / modify / resume
- `#210` DOC-02：Playbook 与仓库现实同步

### Engagement / 热爱机制
- `#189` TASK-ENG-09~23 总收口 Epic
- `#195` ENG-09：KG 手动编辑确认仪式
- `#196` ~ `#208`：ENG-10 ~ ENG-23 各分项
- `#209`：ENG-09 当前在审 PR

## 使用方法

1. **判断现状**：先读 `00-status-matrix.md`，不要被旧印象带偏。
2. **选阶段文件**：P1 看 `01`，P3 看 `02`，P4+/ENG 看 `03` / `04`，前端看 `05`。
3. **再读 spec**：按模块去 `openspec/specs/<module>/spec.md`。
4. **落任务**：优先挂到已有 open issue；没有就先补 issue，再开 `task/<N>-<slug>` worktree。
5. **验证优先**：任何“完成”都必须对应真实命令与输出，不接受文档式乐观判断。
