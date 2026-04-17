# P3：项目智能 — 多文档 + KG + Memory

> 阶段状态：🟡 主干已成形，剩收口
>
> 本文件聚焦 **P3 已落地能力、仍未收口的链路、建议执行顺序**。

---

## 目标验收场景

用户创建项目 → 添加多个文档 → 使用角色/地点/KG → 搜索全文与语义结果 → 写作后触发 KG / memory / quality hooks → AI 逐渐理解项目上下文。

**一句话**：P3 已经不是“从零开始”，而是“从后端基础到产品闭环的最后一段路”。

---

## 已落地主项

| 任务 | 当前状态 | 证据 / 备注 |
|------|------|------|
| P3-01 KG recognizer 主路径 | ✅ 已完成 | `kgRecognitionRuntime.ts` 默认 Aho-Corasick 主路径；Mock recognizer 不再是主生产路径 |
| P3-02 Trie 缓存 | ✅ 已完成 | `trieCache.ts` + 相关测试 |
| P3-03 Hook 主链 | ✅ 主干已接通 | `kg-update` / `memory-extract` / `quality-check` + milestone hook 已在 `ipc/ai.ts` 里接线 |
| P3-06 项目上下文重绑定 | ✅ 已完成 | `projectLifecycle.switchProject` + `contextRebinder` |
| P3-07 三个 P3 Skill | ✅ 已完成 | `consistency-check` / `dialogue-gen` / `outline-expand` 已注册且有测试 |

---

## 部分完成，仍需收口

| 任务 | 当前状态 | 剩余工作 | 关联 issue |
|------|------|------|------|
| P3-04 Memory Layer 1 | 🟡 服务与 IPC 已有 | 让 session-aware memory 真正进入默认上下文注入主链，并补前端消费 | 可继续拆到 P4 / memory follow-up |
| P3-05 AutoCompact | 🟡 服务与测试已在 | 把 narrative compact 接成真实产品链路，而不只是孤立服务 | `#193` |
| P3-08 故事状态摘要 | 🟡 服务已完成 | IPC / Dashboard / 首页入口未接好 | 与 ENG-01 合流 |

---

## 现在最值得做的 P3 收尾顺序

1. **把 session memory / episodic memory 接进默认上下文主链**
   让 Memory-First 真正体感成立，而不是只停留在“服务已在”。
2. **把故事状态摘要接到真实 UI**
   它是最便宜也最能让 P3 被用户感知的能力。
3. **把 AutoCompact 变成真实可用能力，而不是测试里的能力**
   否则 INV-5 只算半完成。
4. **继续补 Hook 链的 P4 项**
   例如 semantic index / episodic profile / spark inspiration 等后续 hook。

---

## P3 → P4 的分界线

当以下条件成立时，可认为 P3 基本收口：

- [x] KG recognizer / trie cache / 项目切换 / P3 skills 已落地
- [x] Hook 主链已接通
- [ ] session-aware memory 已成为默认主注入路径
- [ ] story status / memory / hooks 能在主界面被用户真实感知
- [ ] AutoCompact 不再只是服务层能力

**换句话说：P3 现在的主要矛盾，不是“有没有功能”，而是“这些功能是否真正进入产品主路径”。**
