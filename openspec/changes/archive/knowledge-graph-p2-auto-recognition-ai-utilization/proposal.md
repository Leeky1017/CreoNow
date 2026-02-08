# 提案：knowledge-graph-p2-auto-recognition-ai-utilization

## 背景

Knowledge Graph 主 spec 中的自动识别建议与 AI 续写利用属于 KG 的智能化阶段，依赖 KG-1 的数据契约和 KG-2 的面板 UI 承载。
若在基础能力未稳定时提前接入识别与注入，容易造成建议卡展示路径、并发控制与降级语义不一致，并放大对 Context Engine/AI Service 的耦合风险。

## 变更内容

- 仅覆盖 KG 主 spec 的 2 个 requirement：
  - 自动识别与建议添加
  - AI 续写中的知识图谱利用
- 依赖约束：`knowledge-graph-p1-visualization-extended-views` 合并后再进入实现。
- 定义自动识别触发：autosave 后由主进程后台异步执行，不阻塞编辑器。
- 固化建议推送通道：`knowledge:suggestion:new`（Main → Renderer Push）。
- 固化建议处理通道：`knowledge:suggestion:accept`、`knowledge:suggestion:dismiss`。
- 定义同一编辑会话内忽略去重策略，避免重复建议。
- 定义 KG→CE Rules 层注入接口（mock contract），为后续真实 CE 对接留口。
- 固化 `knowledge:query:relevant` 相关实体筛选策略（语义相似度或关键词匹配）。
- 纳入跨切场景：网络/IO 失败、并发背压（上限 4）、跨项目访问阻断。

## 受影响模块

- `openspec/changes/knowledge-graph-p2-auto-recognition-ai-utilization/**`
- `apps/desktop/main/src/services/kg/**`
- `apps/desktop/main/src/services/ai/**`（mock 适配层）
- `apps/desktop/main/src/services/context/**`（Rules 注入接口占位）
- `apps/desktop/main/src/ipc/knowledgeGraph.ts`
- `apps/desktop/renderer/src/features/kg/**`（建议卡 UI）
- `apps/desktop/renderer/src/features/ai/**`

## 不做什么

- 不实现 Context Engine 的真实 Rules 注入流水线（仅接口定义与 mock）。
- 不实现 AI Service 的真实 LLM 调用（仅 mock 适配）。
- 不实现 Memory System 联动。

## 审阅状态

- Owner 审阅：`PENDING`
