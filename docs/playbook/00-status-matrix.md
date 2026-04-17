# 模块成熟度矩阵 + INV 合规现状

> 最后更新：2026-04-17
>
> 本文件记录 **当前主分支真实状态**，不是 2026-04-11 的初版估计。任何任务开始前，先看这里再判断从哪一层下手。

---

## 一、模块成熟度矩阵

| 模块 | 分数 | 阶段 | 当前状态 | 主要缺口 |
|------|------|------|------|------|
| Context Engine | 9/10 | P1 ✅ | 生产就绪 | 高阶记忆与 AutoCompact 仍未完全纳入默认主链 |
| Version Control | 8.5/10 | P1 ✅ | 生产就绪 | 压缩/整理仍偏轻；部分高级 UX 仍待补 |
| Search | 8.5/10 | P3 ✅ | FTS5 + semantic / hybrid 已可用 | `semanticSearch.ts` 独立服务边界与写时索引 hook 仍待抽出（#192） |
| Export | 7.5/10 | P3 ⚠️ | 后端与前端弹窗已可用 | Publish/send 仍偏占位；错误与进度体验还可加固 |
| AI Service / Orchestration | 7.5/10 | P1 ✅ / P4 ⚠️ | INV-6/7 主路已打通 | Agentic loop 高阶控制未完成（#194） |
| Knowledge Graph | 8/10 | P3 ✅ | CRUD、recognizer、trie cache、graph panel 都已落地 | 大图性能 / 删除确认流 / 更深产品入口待补（#191, #195） |
| Documents | 7.5/10 | P1 ✅ | 闭环写回、版本、确认流已可用 | 更重的后端编辑抽象仍不是主重点 |
| Skills | 8/10 | P1 ✅ / P3 ✅ | Manifest loader、P3 skills、写回路径、hook 工厂均已落地 | 更完整 dispatcher / task ledger 仍属后续架构工作 |
| Memory | 7/10 | P3 ⚠️ | L0、episodic、session memory、semantic 蒸馏骨架均在 | L1 主注入、前端消费、profile 调度仍未收口 |
| Engagement | 7/10 | P3/P5 ⚠️ | story status / flow / foreshadow / quick capture / style / world scale / milestone / persona / completion 均有后端基础 | 大量前台接线与高阶机制仍待完成（#189, #195-#208） |
| Diff | 6.5/10 | P2 ✅ | 核心算法稳定 | 更多编辑器可视化细节仍可增强 |
| Judge | 5.5/10 | P2 ⚠️ | 能力存在但非当前主战场 | 缺完整产品化入口 |
| Editor Backend | 5/10 | P1 ⚠️ | 闭环通路已可用，不再只是 stub | 真正的“后端化编辑器”仍不是现阶段主目标 |

### 评分解释
- **9-10**：主链稳定、测试充分、当前可当事实依赖
- **7-8**：功能已成形，可交付，但仍有明显 follow-up
- **5-6**：核心能力存在，产品化或结构化仍不足
- **3-4**：局部骨架
- **1-2**：几乎只有名字

---

## 二、INV 合规快照

| INV | 名称 | 当前状态 | 说明 |
|-----|------|---------|------|
| INV-1 | 原稿保护 | ✅ | 写前快照 + preview/confirm 主链已在主路径中 |
| INV-2 | 并发安全 | ✅ | `toolRegistry` fail-closed 默认成立 |
| INV-3 | CJK Token | ✅ | `packages/shared/tokenBudget.ts` 已迁移为 CJK-aware |
| INV-4 | Memory-First | ⚠️ | L0 / KG+FTS5 / episodic / session memory 都在；但 session-aware 注入与前端消费未完全收口 |
| INV-5 | 叙事压缩 | ⚠️ | `narrativeCompact.ts` 已有实现与测试，但尚未形成完整用户可感知主链 |
| INV-6 | 一切皆 Skill | ✅（主干） | AI/KG 写路径已走 Skill / Orchestrator；仍有少量高阶 follow-up |
| INV-7 | 统一入口 | ✅（主干） | IPC 主路径已不再直调关键变更服务；完整 `CommandDispatcher` 仍属后续架构演进 |
| INV-8 | Hook 链 | ⚠️ | 已接 cost-tracking / auto-save / kg-update / memory-extract / quality-check / engagement-milestone；仍有 P4 级 hook 待补 |
| INV-9 | 成本追踪 | ✅（主干） | `cachedTokens` 已接通；持久化账本仍属下一层架构工作 |
| INV-10 | 错误不丢上下文 | ⚠️ | 典型 silent catch 已大幅清理；仍需持续守卫 |

### 当前优先级

```text
继续收口：INV-4 / INV-5 / INV-8 / INV-10
主要已过主线门槛：INV-1 / INV-2 / INV-3 / INV-6 / INV-7 / INV-9
```

---

## 三、关键现实提醒

1. **P1 不再是“等实现”**：它现在是“主闭环已成，剩加固”。
2. **P3 不是空架子**：recognizer、trie cache、project switch、P3 skills、hook 工厂都已落地。
3. **P4 不再纯规划**：KG graph canvas 与 semantic / hybrid search 已在 renderer/workbench 中可见。
4. **Engagement 不是从零开始**：已有一批后端服务，只是前端接线没跟上。
5. **文档判断必须服从代码与测试**：旧版 `backend-quality-assessment.md` / 初版 playbook 只能作历史参考，不能直接当现状。
