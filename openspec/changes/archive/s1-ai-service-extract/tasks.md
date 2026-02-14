## 1. Specification

- [x] 1.1 审阅并确认 `s1-ai-service-extract` 的边界：仅提取 `runtimeConfig`、`errorMapper`、`providerResolver`，不扩展业务能力
- [x] 1.2 审阅并确认错误路径与边界路径：外部契约漂移、provider 状态泄漏、提取后双路径并存
- [x] 1.3 审阅并确认不可变契约：`createAiService` 对外接口与响应包络保持不变
- [x] 1.4 先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”结论（本 change 预期 `NO_DRIFT`）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个失败测试（提取边界、外部接口、状态隔离）
- [x] 2.2 为每个测试标注 Scenario ID（`AI-S1-ASE-S1/S2/S3`），建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

| Scenario ID    | 测试文件                                                                               | 测试名称（拟定）                                                             | 断言要点                                                               |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `AI-S1-ASE-S1` | `apps/desktop/main/src/services/ai/__tests__/ai-runtime-and-error-extract.test.ts`     | `runtimeConfig and errorMapper are delegated via extracted modules`          | `aiService` 仅通过提取模块完成运行时配置解析与错误映射，不保留重复实现 |
| `AI-S1-ASE-S2` | `apps/desktop/main/src/services/ai/__tests__/ai-public-contract-regression.test.ts`    | `createAiService public methods remain contract-compatible after extraction` | `runSkill/cancel/listModels` 的签名与包络语义保持一致                  |
| `AI-S1-ASE-S3` | `apps/desktop/main/src/services/ai/__tests__/providerResolver-state-isolation.test.ts` | `providerResolver instances keep isolated runtime state`                     | 不同 resolver 实例的健康状态与退避计数互不污染                         |

## 3. Red（先写失败测试）

- [x] 3.1 编写 `AI-S1-ASE-S1` 失败测试：先证明 `aiService` 仍内联 runtime/error 逻辑导致提取边界不满足
- [x] 3.2 编写 `AI-S1-ASE-S2` 失败测试：先证明提取后潜在契约漂移会被测试捕获
- [x] 3.3 编写 `AI-S1-ASE-S3` 失败测试：先证明 resolver 共享状态会导致实例互相污染
- [x] 3.4 运行最小测试集并记录 Red 证据（失败输出与 Scenario ID 对应）

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 `AI-S1-ASE-S1/S2/S3` 转绿的最小代码（提取 `runtimeConfig`、`errorMapper`、`providerResolver`）
- [x] 4.2 将 `aiService.ts` 收敛为聚合层，删除重复逻辑并改为模块委托
- [x] 4.3 保持 `createAiService` 对外接口与行为语义不变，不引入额外功能
- [x] 4.4 复跑对应测试确认全部 Green

## 5. Refactor（保持绿灯）

- [x] 5.1 去重并清理提取遗留分支，防止 `aiService` 与子模块出现双路径实现
- [x] 5.2 校验命名与模块边界可读性，避免过度抽象导致链路不可追踪
- [x] 5.3 复跑 AI Service 相关回归，确认外部契约与行为稳定

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 关键命令、输出与结论
- [x] 6.2 在 RUN_LOG 记录 依赖同步检查（Dependency Sync Check） 的输入、核对项、结论（无漂移/已更新）
- [x] 6.3 在 RUN_LOG 记录提取后外部接口回归证据与 provider 状态隔离证据
