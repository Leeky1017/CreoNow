> 本文件是 backend-design 的一部分，完整索引见 [docs/references/backend-design/README.md](README.md)

# 四、智能系统设计 — 交互层（记忆边界 · Dreaming · Plan Mode · 情绪学习 · 提取 Prompt · 多模型）

本文件涵盖 KG / 记忆 / AI 交互层设计（§4.10–4.15）。数据层（Schema · 存储 · 提取规则）见 [kg-schema.md](kg-schema.md)，基础设施（FTS5 · UX）见 [kg-infrastructure.md](kg-infrastructure.md)。

---

## 4.10 负面反馈学习（Sentiment-Aware Learning）（计划实现）

当前实现：用户通过结构化 `ai:skill:feedback` IPC 提交显式反馈（`preferenceLearning.ts`）。以下为目标设计，尚未实现：

- 检测用户不满：当用户表达负面情绪（"不是这样""重来""算了"等），系统记录：AI 做了什么 -> 用户为什么不满
- 写入 `MEMORY.md`（计划创建）：提取"不要再这样做"的规则
- 下次同类场景：Agent 参考这条记忆，避免重蹈覆辙

> **已实现位置**：显式反馈路径已实现于 `apps/desktop/main/src/services/memory/preferenceLearning.ts`（含测试 `preferenceLearning.test.ts`）。隐式情绪检测为计划实现。

## 4.11 Plan Mode（引导式交互）（类型与 hint 机制存在，主路径尚未透传）

当前状态：`SkillRunPayload` 类型定义了 `mode: "agent" | "plan" | "ask"`（`ipc/ai.ts:74`），`runtimeConfig.ts` 的 `modeSystemHint("plan")` 返回完整提示 `"Mode: plan\nFirst produce a concise step-by-step plan before final output."`。但 `ai:skill:run` 主路径在 3 处将 mode 硬编码为 `"ask"`（`ipc/ai.ts:1448,1540,1590`），用户指定的 mode 尚未透传到 orchestrator/runtimeConfig。

> **已实现位置**：`apps/desktop/main/src/services/ai/runtimeConfig.ts`（`modeSystemHint()` 函数）；类型定义在 `ipc/ai.ts`。主路径透传为计划实现。

目标设计（计划实现）——透传用户 mode + 自动触发条件：用户指令含模糊词汇（"写好""完善""这个""搞定""改改"）且缺乏具体约束时，Agent 自动进入 Plan Mode，不直接动手，而是先澄清意图。

## 4.12 KG 与记忆系统的边界

|  | 记忆系统（Memory） | 知识图谱（KG） |
| --- | --- | --- |
| 服务对象 | 用户 + 项目 | 项目内容本身 |
| 存什么 | 用户偏好、写作风格、句式习惯 | 角色、地点、事件、关系、伏笔、时间线 |
| 跨项目 | 是，用户偏好跨项目生效 | 否，每个项目独立的 KG |
| 注入方式 | Layer 0 始终注入 system prompt | 部分注入：`rulesFetcher.ts` 将 `aiContextLevel: "always"` 的 KG 实体注入 context；其余通过 Skill 按需查询 |
| 数据规模 | 小（<=200行/25KB） | 大（可能几千实体、上万关系） |

重要：KG 内容不全量注入 Layer 0。标记为 `aiContextLevel: "always"` 的关键实体由 `rulesFetcher.ts` 注入 context，其余 KG 数据通过 Skill 按需查询（契合 INV-6）。

> **已实现位置**：记忆服务位于 `apps/desktop/main/src/services/memory/memoryService.ts`（CRUD + 配额 + 注入）、`episodicMemoryService.ts`（片段记忆）、`simpleMemoryService.ts`（简易记忆）。KG 注入路径见 `services/context/layerAssemblyService.ts`。KG 上下文级别查询见 `services/kg/__tests__/kgService.contextLevel.test.ts`。

## 4.13 Dreaming 机制（记忆整合）（计划实现）

> 注：`MEMORY.md`、每日笔记（`memory/YYYY-MM-DD.md`）均为计划创建的文件，当前尚未存在。

短期记忆（每日笔记）经过评分、筛选后，有选择地固化为长期记忆（`MEMORY.md`）。

评分维度（5 个信号，加权求和）：

| 信号 | 权重 | 含义 |
| --- | --- | --- |
| 召回频率 | 30% | 近期对话中被引用/提及过几次？高 = 重要 |
| 信息密度 | 25% | 是具体事实还是模糊笔记？具体 = 高分 |
| 用户验证 | 20% | 用户是否在 KG 面板里确认/修正/引用过？用户碰过 = 高分 |
| 新鲜度 | 15% | 最近写入的分数高，随时间指数衰减（半衰期 7 天） |
| 唯一性 | 10% | `MEMORY.md` 或 KG 中是否已有相同/相似信息？重复 = 低分 |

提升门槛：score >= 0.7 才从每日笔记提升到 `MEMORY.md`（可配置）

运行时机：

- 每次用户打开 CN 时检查：如果距上次 Dreaming > 24 小时，自动运行
- 或者当每日笔记积累 > 10 条时触发
- 后台异步，不阻塞用户

`MEMORY.md` 溢出处理：

- 接近 200 行上限时，触发"压缩 Pass"
- LLM 合并相近条目
- 过去 30 天未被访问的条目 -> 降级到 `memory/archive/YYYY-MM.md`（计划创建）
- 归档条目仍可通过 FTS5 搜索，但不再注入 Layer 0

Dreaming Pipeline：

```
每日笔记 -> 逐条评分（5 维度加权）
  -> score >= 0.7 -> 检查唯一性
    -> 唯一 -> 写入 MEMORY.md
    -> 重复 -> 合并到已有条目
  -> score < 0.7 -> 留在每日笔记，继续衰减
  -> score < 0.3 且 > 30 天 -> 归档
MEMORY.md 超限 -> 压缩 Pass -> 合并 + 归档低频条目
```

## 4.14 AI 提取 Prompt 设计（目标设计，当前仓库中未实现此 prompt 模板）

核心原则：Schema 感知 + 已有实体去重 + 结构化 JSON 输出。

Prompt 结构（计划实现）：

```markdown
你是 CreoNow 的知识提取引擎。

## 输入
- 增量文本（自上次提取以来的新增内容）
- 当前项目的 KG Schema（实体类型、关系类型、属性类型及别名）
- 已有实体列表（用于去重匹配）

## 任务
从增量文本中提取：
1. 新实体（角色、地点、物品、组织、事件）
2. 实体属性变化（位置变化、状态变化、新身份）
3. 新关系（认识、敌对、效忠、亲属等）

## 规则
- 只提取文本中明确出现的信息，不推测
- 不确定的信息（"可能""似乎"）设 confidence=0.3
- 优先匹配已有实体
- 使用 Schema 中的别名匹配属性和关系类型

## 输出格式（JSON）
{
  "entities": [{ "name": "...", "type": "...",
    "matchExisting": "已有实体ID或null" }],
  "properties": [{ "entityName": "...",
    "property": "...", "value": "...",
    "confidence": 0.8 }],
  "relations": [{ "source": "...", "type": "...",
    "target": "...", "layer": "...",
    "confidence": 0.8 }],
  "chapterRef": "ch5"
}
```

关键设计：

- 把 Schema（含别名）作为 prompt 一部分传给 LLM
- 把已有实体列表传进去，避免重复创建
- 用 JSON Schema 约束输出格式
- 提取用辅助模型，不用主模型，控制成本

## 4.15 多模型策略（计划实现）

CN 不提供模型，用户自接 API。目标设计为两个模型槽位，用户自配。当前实现已支持多 `providerMode` 配置（OpenAI-compatible / OpenAI BYOK / Anthropic BYOK，各有独立 baseUrl + apiKey 字段，见 `ipc/aiProxy.ts` 和 `SettingsPage.tsx`），但尚无双模型槽位路由。模型名为渲染进程本地 UI 状态。

> **已实现位置**：Provider 配置见 `apps/desktop/main/src/services/ai/aiProxySettingsService.ts`；Provider 解析见 `services/ai/providerResolver.ts`；已知模型列表见 `services/ai/knownModels.ts`。

| 槽位 | 用途 | 推荐等级 |
| --- | --- | --- |
| 辅助模型（计划实现） | KG 提取、Dreaming 整合、记忆提取、情绪检测、Plan Mode 意图分析 | 中等 |
| 主模型（计划实现） | 写作、Plan Mode 对话、内容生成 | 用户自选 |

技术实现（计划实现）：

- 统一的 `ModelRouter` 接口（计划实现）：`getModel(task: 'extract' | 'dream' | 'write' | 'plan') -> ModelConfig`
- 支持 OpenAI-compatible API 格式（当前已实现基本 proxy）
- 用户在设置中配置：API Key + Endpoint + providerMode（当前已实现于 `SettingsPage.tsx`）。模型名（Model Name）为工作台本地 UI 状态（`useAiSkillController.ts`），不在设置页面
- 如果用户只配了一个模型，所有任务都用这一个（当前默认行为）
- 不局限于任何供应商
