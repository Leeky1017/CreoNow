## 1. Specification

- [x] 1.1 审阅并确认“动态模型目录”范围边界
- [x] 1.2 审阅并确认 IPC 契约兼容策略（枚举→字符串）
- [x] 1.3 审阅并确认 Settings/Panel 联动方案

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] S1 `ai:models:list 返回动态模型目录 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ai-service-model-catalog.test.ts`
  - 用例：`should list upstream model ids with provider metadata`
- [x] S2 `Proxy 优先来源模型目录 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ai-service-model-catalog.test.ts`
  - 用例：`should resolve model catalog from proxy settings when enabled`
- [x] S3 `AI Panel ModelPicker 使用动态列表 [ADDED]`
  - 测试：`pnpm typecheck`（类型与调用链验证）
  - 用例：`AiPanel uses ai:models:list response to render picker`
- [x] S4 `带路径前缀 baseUrl 端点拼接正确 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ai-service-model-catalog.test.ts`
  - 用例：`should keep /api/v1 prefix when requesting model catalog`
- [x] S5 `runSkill 对带路径前缀 baseUrl 拼接正确 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ai-service-run-options.test.ts`
  - 用例：`should keep /api/v1 prefix when requesting chat completions`
- [x] S6 `非 JSON 上游响应返回确定性错误 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ai-service-model-catalog.test.ts`
  - 用例：`should return UPSTREAM_ERROR for non-JSON model catalog response`
- [x] S7 `runSkill 非 JSON 上游响应返回确定性错误 [ADDED]`
  - 测试：`apps/desktop/tests/unit/ai-service-run-options.test.ts`
  - 用例：`should return UPSTREAM_ERROR for non-JSON runSkill response`

## 3. Red（先写失败测试）

- [x] 3.1 编写并执行 `ai-service-model-catalog` 失败测试（新增用例）
- [x] 3.2 记录 Red→Green 证据到 RUN_LOG
- [x] 3.3 确认新增契约在生成前无法通过类型约束

## 4. Green（最小实现通过）

- [x] 4.1 新增 `ai:models:list` 契约并生成共享类型
- [x] 4.2 在 Main AI Service 实现模型目录拉取
- [x] 4.3 在 AI IPC 层注册 `ai:models:list` handler
- [x] 4.4 在 AiPanel/Proxy Settings 使用动态模型列表

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离模型目录解析逻辑，避免重复
- [x] 5.2 保留静态 fallback，防止模型目录临时不可用
- [x] 5.3 修复 URL 拼接与 JSON 解析错误映射，避免 OpenRouter HTML 错误扩散
- [x] 5.4 引入 providerMode（openai-compatible/openai-byok/anthropic-byok）并保持旧字段兼容
- [x] 5.5 升级 ModelPicker 交互（搜索/分组/滚动/最近使用）

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含关键命令输出与通过证据）
