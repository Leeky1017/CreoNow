## 1. Specification

- [x] 1.1 审阅主 spec `skill-system/spec.md` 中「内置技能清单与 I/O 定义」的全部 Scenario（3 个）
- [x] 1.2 审阅主 spec 中「技能执行与流式响应」的全部 Scenario（3 个）
- [x] 1.3 审阅 8 个内置技能的输入/输出/上下文规则定义
- [x] 1.4 审阅 `ai:skill:run`/`skill:stream:chunk`/`skill:stream:done`/`ai:skill:cancel` 四个 IPC 通道的通信模式与 schema
- [x] 1.5 审阅 SkillResult 结构（output / metadata / traceId）
- [x] 1.6 依赖同步检查（Dependency Sync Check）：上游 AI Service（Phase 1）+ Context Engine（Phase 3）+ IPC（Phase 0）；核对 LLM 代理接口、上下文组装 API、IPC 通道注册方式、错误码命名空间

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S「用户触发润色技能」→ 测试文件
- [x] 2.2 S「续写技能使用文档上下文」→ 测试文件
- [x] 2.3 S「技能执行输入校验失败」→ 测试文件
- [x] 2.4 S「技能流式执行正常完成」→ 测试文件
- [x] 2.5 S「用户取消正在执行的技能」→ 测试文件
- [x] 2.6 S「技能执行失败的错误处理」→ 测试文件

## 3. Red（先写失败测试）

- [x] 3.1 编写内置技能执行（润色/续写/输入校验）的失败测试
- [x] 3.2 编写流式响应（chunk 推送/done 完成/cancel 中断）的失败测试
- [x] 3.3 编写错误处理（LLM 失败/超时）的失败测试
- [x] 3.4 记录 Red 失败输出与关键日志至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 最小实现 8 个内置技能的数据定义与注册
- [x] 4.2 最小实现 SkillExecutor（输入校验 + 上下文组装 + LLM 调用）
- [x] 4.3 最小实现流式 IPC 管道（ai:skill:run → stream:chunk → stream:done）
- [x] 4.4 最小实现 ai:skill:cancel 取消机制
- [x] 4.5 最小实现结构化错误返回与 AI 面板展示

## 5. Refactor（保持绿灯）

- [x] 5.1 抽象技能定义为声明式注册表（避免 if/switch 链）
- [x] 5.2 统一流式推送与完成通知的事件格式
- [x] 5.3 全量回归保持绿灯

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
