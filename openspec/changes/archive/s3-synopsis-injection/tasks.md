## 1. Specification

- [x] 1.1 审阅并确认 `s3-synopsis-injection` 范围：摘要入库、检索与续写注入
- [x] 1.2 审阅并确认失败路径：存储失败、检索失败、空摘要项目的降级行为
- [x] 1.3 审阅并确认不可变契约：续写主流程可用、层组装优先级与预算策略不被破坏
- [x] 1.4 在进入 Red 前完成依赖同步检查（Dependency Sync Check），记录“无漂移/已更新”；无上游依赖时标注 N/A

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [x] S3-SYN-INJ-S1 `续写时按章节顺序注入前几章摘要 [ADDED]`
- [x] S3-SYN-INJ-S1 `续写时按章节顺序注入前几章摘要 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/context/__tests__/synopsisFetcher.test.ts`
  - 测试名：`injects previous chapter synopsis in deterministic order`
- [x] S3-SYN-INJ-S2 `无摘要数据时续写流程保持正常 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/context/__tests__/layerAssemblyService.synopsis.test.ts`
  - 测试名：`keeps continue flow valid when no synopsis exists`
- [x] S3-SYN-INJ-S3 `存储或检索失败时返回结构化降级信号 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/context/__tests__/synopsisStore.error-path.test.ts`
  - 测试名：`emits structured degradation signals on synopsis persistence failure`

## 3. Red（先写失败测试）

- [x] 3.1 编写 S3-SYN-INJ-S1 失败测试，确认当前未实现稳定注入
- [x] 3.2 编写 S3-SYN-INJ-S2 失败测试，确认无摘要场景未覆盖
- [x] 3.3 编写 S3-SYN-INJ-S3 失败测试，确认失败可观测语义缺失
- [x] 3.4 运行最小测试集并记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 实现 `synopsisStore` 表结构与存取接口
- [x] 4.2 实现 `synopsisFetcher` 并注册到 layer 组装链路
- [x] 4.3 建立失败时结构化降级输出，确保续写主流程可用

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛摘要注入组装逻辑，去除重复转换和透传 helper
- [x] 5.2 复核注入顺序与 token 预算裁剪策略的一致性

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录摘要入库、检索、注入与失败降级的验证证据
