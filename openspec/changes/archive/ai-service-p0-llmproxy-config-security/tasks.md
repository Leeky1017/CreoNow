## 1. Specification

- [x] 1.1 审阅 `LLMProxy` 抽象边界（provider 适配、认证、请求构造、解析）
- [x] 1.2 锁定 `ai:config:get|update|test` 契约与错误码映射
- [x] 1.3 明确 safeStorage 加密存储与脱敏返回策略
- [x] 1.4 依赖同步检查（Dependency Sync Check）：上游依赖 `N/A`；结论 `NO_DRIFT`
- [x] 1.5 Out-of-scope 确认：不进入流式 UI、Judge、多候选

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S1「配置更新与加密存储闭环」→ `apps/desktop/main/src/services/ai/__tests__/llm-proxy-config.test.ts`
- [x] 2.2 S2「配置测试失败返回可判定错误码」→ `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts`
- [x] 2.3 S3「LLM 请求触发重试与限流基线」→ `apps/desktop/main/src/services/ai/__tests__/llm-proxy-retry-rate-limit.test.ts`
- [x] 2.4 建立 Scenario ID 与测试用例标题一一映射，未 Red 不得进 Green

## 3. Red（先写失败测试）

- [x] 3.1 先写 S1 失败测试：当前实现明文/脱敏策略不满足即失败
- [x] 3.2 先写 S2 失败测试：`ai:config:test` 未返回 `AI_AUTH_FAILED` 即失败
- [x] 3.3 先写 S3 失败测试：缺失退避/限流基线即失败
- [x] 3.4 记录失败输出到 RUN_LOG（命令、退出码、关键断言）

## 4. Green（最小实现通过）

- [x] 4.1 最小实现 `LLMProxy` 配置读写与 safeStorage 加密
- [x] 4.2 最小实现 `ai:config:*` IPC handler 的结构化响应
- [x] 4.3 最小实现指数退避与默认速率限制策略
- [x] 4.4 仅让 Red 用例转绿，不扩展非本 change 范围

## 5. Refactor（保持绿灯）

- [x] 5.1 去重 provider 配置解析与错误码映射逻辑
- [x] 5.2 抽离可复用重试/限流策略且保持行为不变
- [x] 5.3 保持所有新增测试全绿

## 6. Evidence

- [x] 6.1 RUN_LOG 记录：Red 失败证据 + Green 通过证据 + 关键命令输出
- [x] 6.2 记录 依赖同步检查（Dependency Sync Check）（数据结构/IPC 契约/错误码/阈值）= `NO_DRIFT`
- [x] 6.3 记录 Out-of-scope 未越界检查结果
