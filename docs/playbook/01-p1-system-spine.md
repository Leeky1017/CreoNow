# P1：系统脊柱 — 闭环 Demo

> 阶段状态：✅ 主目标已完成
>
> 本文件不再列“P1 尚未开工任务”，而是记录 **已完成的 P1 主闭环** 与 **剩余收尾 / 架构加固项**。

---

## 目标验收场景

用户打开 CN → 选中文本 → 触发 Skill → 获得 AI 预览 → 确认写回 → 自动创建版本快照 → 可撤销。

**一句话**：从「选文」到「可撤销」的完整闭环，已经打通。

---

## 已完成主项（已并入主分支）

| 任务 | 结果 | 证据 |
|------|------|------|
| P1-01 INV-3 Token 预算修复 | ✅ 已完成 | Issue `#148` 已关闭；`packages/shared/tokenBudget.ts` 已为 CJK-aware |
| P1-02 AI IPC → Skill 系统 | ✅ 已完成 | Issue `#154` 已关闭；`apps/desktop/main/src/ipc/ai.ts` 主路经 `skillOrchestrator` |
| P1-03 KG 写 IPC → Skill | ✅ 已完成 | Issue `#155` 已关闭；`apps/desktop/main/src/ipc/knowledgeGraph.ts` |
| P1-04 Skill Manifest Loader 激活 | ✅ 已完成 | Issue `#152` 已关闭；启动期 warmup manifests |
| P1-05 写回路径唯一化 | ✅ 已完成 | Issue `#158` 已关闭；Stage 7 canonical write-back 已落地 |
| P1-06 silent catch 清理 | ✅ 主干完成 | Issue `#149` 已关闭；典型 silent catch 模式已清零 |
| P1-07 Editor Backend IPC 闭环 | ✅ 主干完成 | Issue `#160` 已关闭；预览 / 确认 / 写回 / 快照链路已可走通 |
| P1-08 cachedTokens 成本追踪 | ✅ 已完成 | Issue `#161` 已关闭 |

---

## P1 收尾不再叫“功能待做”，而是“架构加固”

这些项不阻断 P1 主闭环，但会影响后续扩展稳定性：

| 议题 | 现状 | 对应后续 |
|------|------|------|
| `CommandDispatcher` 统一边界 | 主干语义已成立，但完整显式边界类型仍未抽出 | 见 `docs/issue-packs/2026-04-14-architecture-issue-pack.md` 的 P1-09 |
| 依赖方向硬门禁 | 文档与部分脚本已有，但还不是完整 CI 边界图 | P1-10 |
| 成本账本持久化 | 运行时统计已可用，持久化 ledger 仍后续 | P1-11 |
| 持久任务 / 执行账本 | 长任务演进需要 | P1-12 |
| SQLite bootstrap 统一 | 仍可继续整理 | P1-13 |
| provider breaker / hook 模块进一步抽离 | 可读性和可维护性层面的下一步 | P1-14 / P1-15 |

---

## 现在的 P1 退出条件

以下条件按主分支现实，已经基本满足：

- [x] 闭环 Demo 可运行：选文 → Skill → Diff / Preview → 确认 → 版本
- [x] INV-1 / INV-2 / INV-3 / INV-6 / INV-7 / INV-9 主干合规
- [x] CI 与本地主验证链路已能证明核心路径不再是 stub
- [x] P1 任务已从“实现问题”转入“结构加固问题”

**因此：P1 当前应视为已完成主阶段，后续工作按 architecture hardening 继续，不应再把 merged 项写成待做。**
