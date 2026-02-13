# 提案：issue-513-p1p2-integration-closeout

## 背景

`docs/plans/p1p2-integration-check.md` 仍存在未闭环项：

- API Key 缺失错误码语义未统一（`AI_NOT_CONFIGURED` vs `AI_PROVIDER_UNAVAILABLE`）
- `buildLLMMessages` / `chatMessageManager` 未接入运行时主链路
- G1/G2/G3/G4/G5 缺少自动化集成回归

若不在 P3 前完成闭环，会继续放大“规范已定义但主链路未执行”的漂移风险。

## 变更内容

- 统一 `runSkill` 路径下“Provider 凭据缺失”错误语义为 `AI_PROVIDER_UNAVAILABLE`。
- 将 `buildLLMMessages` 与 `chatMessageManager` 接入 `aiService` 运行时请求组装：
  - 多轮历史参与请求
  - 按 token budget 裁剪最旧历史
  - 保持 `system + current user` 强保留
- 补齐并固化 G1/G2/G3/G4/G5 自动化测试，覆盖：
  - `skill run -> context assemble -> LLM(mock) -> stream`
  - KG 变更联动到运行时上下文
  - API Key 存储到调用链路
  - 多轮历史裁剪
  - KG + Memory 全降级下 AI 可用

## 受影响模块

- ai-service — 错误码语义、运行时消息组装、多轮裁剪
- cross-module-integration-spec — G1/G2/G3/G5 跨模块闭环场景
- tests/integration — 新增或扩展集成回归用例

## 不做什么

- 不引入真实 LLM 到 CI（保持 mock）
- 不改动 P3/P4 范围（如 Editor→Memory 新行为）
- 不改动 required checks / GitHub 门禁策略

## 审阅状态

- Owner 审阅：`PENDING`
