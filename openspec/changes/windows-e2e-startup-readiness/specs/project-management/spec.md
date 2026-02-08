# Project Management Specification Delta

## Change: windows-e2e-startup-readiness

### Requirement: 项目创建 [MODIFIED]

在 Windows CI 场景下，项目创建流程必须提供可稳定等待的「编辑器就绪」外显状态，避免 E2E 在创建完成后对内部异步时序做猜测。

E2E 允许的就绪判定应基于可观察 UI 状态组合：

- 创建项目对话框关闭
- `editor-pane` 可见且存在有效 `data-document-id`
- `tiptap-editor` 可见并可聚焦

#### Scenario: 创建项目后进入可编辑状态具备可等待就绪信号 [MODIFIED]

- **假设** 用户在欢迎页点击「Create project」并提交表单
- **当** 主进程完成项目创建与当前项目切换
- **则** 渲染层最终进入可编辑状态（`editor-pane + tiptap-editor` 均可见）
- **并且** E2E 测试可基于该可观察状态稳定等待，不依赖固定时间

#### Scenario: E2E 创建流程使用条件等待而非固定 sleep [ADDED]

- **假设** 平台为 Windows CI，渲染线程与 IPC 初始化速度存在抖动
- **当** 测试执行「创建项目 → 等待编辑器」流程
- **则** 等待策略必须使用条件轮询（可观察状态）
- **并且** 测试中不得通过固定 sleep 掩盖时序问题

