# Document Management Specification Delta

## Change: s2-service-error-decouple

### Requirement: 文档服务错误语义必须与 IPC 传输错误语义解耦 [ADDED]

文档领域 service 必须使用领域错误类型（`DocumentError`）表达失败语义；IPC 层负责将领域错误映射为 `IpcError` 对外返回，避免领域逻辑直接依赖 IPC 传输错误类型。

#### Scenario: DOC-S2-SED-S1 service 层仅返回领域错误 [ADDED]

- **假设** 文档 CRUD service 处理业务失败场景
- **当** service 生成错误返回
- **则** 必须使用 `DocumentError` 或等价领域错误类型
- **并且** 不得直接引用 `IpcError`/`IpcErrorCode`

#### Scenario: DOC-S2-SED-S2 IPC 层完成领域错误到传输错误映射 [ADDED]

- **假设** IPC handler 接收到文档 service 返回的领域错误
- **当** handler 组装 IPC 响应
- **则** 必须将 `DocumentError` 映射为稳定的 `IpcError` 包络
- **并且** 不得改变现有通道对外错误语义契约

## Out of Scope

- 重构非文档域 service 的错误体系。
- 新增 IPC 通道或变更通道命名。
- 扩展文档业务功能本身。
