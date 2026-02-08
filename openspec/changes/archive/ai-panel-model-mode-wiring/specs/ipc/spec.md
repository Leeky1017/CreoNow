# IPC Specification Delta

## Change: ai-panel-model-mode-wiring

### Requirement: Schema-First 契约定义 [MODIFIED]

`ai:skill:run` 通道请求体必须显式声明并传递面板侧运行选项，作为跨进程可判定契约的一部分。

新增字段：

- `mode`：`"agent" | "plan" | "ask"`
- `model`：`"gpt-5.2" | "creo-w" | "deepseek" | "claude-opus"`

该字段必须在 Renderer→Main 全链路保持类型一致，禁止通过隐式环境变量覆盖用户面板选择。

#### Scenario: `ai:skill:run` 请求包含 mode/model [ADDED]

- **假设** 用户在 AI Panel 选择 mode=`plan`、model=`deepseek`
- **当** 渲染层调用 `ai:skill:run`
- **则** IPC 请求体包含 `mode` 与 `model`
- **并且** 主进程 handler 可读取同值

#### Scenario: mode/model 违反枚举时被阻断 [ADDED]

- **假设** 渲染层发送非法 `model` 值
- **当** IPC 运行时校验执行
- **则** 返回 `VALIDATION_ERROR`
- **并且** AI 运行不会进入业务处理逻辑
