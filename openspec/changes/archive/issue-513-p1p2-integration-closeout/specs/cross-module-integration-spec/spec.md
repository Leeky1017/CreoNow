# Cross Module Integration Specification Delta

## Change: issue-513-p1p2-integration-closeout

### Requirement: P1/P2 未闭环链路自动化收口 [ADDED]

为避免带病进入 P3，跨模块链路必须具备可复跑自动化场景，覆盖 G1/G2/G3/G5。

#### Scenario: G1 skill run 到 stream 完整链路可判定 [ADDED]

- **假设** 技能执行具备 project/document 上下文
- **当** 触发 skill run（stream=true）
- **则** 执行路径完成 `skill run -> context assemble -> LLM(mock) -> stream done`
- **并且** `done` 终态与输出可判定

#### Scenario: G2 KG 变更可联动到后续运行时上下文 [ADDED]

- **假设** 同一项目 KG 实体信息发生更新
- **当** 再次触发 skill run
- **则** 新请求中的 context overlay 反映最新 KG 内容
- **并且** 不依赖重启进程

#### Scenario: G3 已持久化 API Key 可贯通到上游调用 [ADDED]

- **假设** API Key 已通过设置服务安全存储
- **当** 触发 skill run
- **则** 上游请求携带正确授权头
- **并且** 不回落为匿名调用

#### Scenario: G5 KG + Memory 全降级时 AI 仍可用 [ADDED]

- **假设** KG 与 Memory 注入均不可用
- **当** 触发 skill run
- **则** Context Engine 返回降级 prompt/warnings
- **并且** AI 仍完成请求并返回结果
